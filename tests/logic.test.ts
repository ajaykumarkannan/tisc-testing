import { describe, expect, it } from "vitest";
import { DEFAULT_TESTS as TESTS, allItems, itemCount } from "../src/lib/tests";
import { validateSheet } from "../src/lib/sheet-validate";
import { canAdminister, isEligible, canViewMember } from "../src/lib/permissions";
import { computeProgress } from "../src/lib/progress";
import { validatePasswordChange } from "../src/lib/password";

describe("sheet definitions", () => {
  it("have unique item keys within each sheet and at least one item", () => {
    for (const t of TESTS) {
      const keys = allItems(t).map((i) => i.key);
      expect(new Set(keys).size, t.key).toBe(keys.length);
      expect(keys.length, t.key).toBeGreaterThan(0);
    }
  });
  it("match the item counts on the 2026 paper sheets", () => {
    expect(Object.fromEntries(TESTS.map((t) => [t.key, itemCount(t)]))).toEqual({
      helms: 20, sr_helms: 9, skipper: 26, laser: 3, laser_only: 16, hobie: 5,
    });
  });
});

describe("permissions", () => {
  const skipper = { id: 1, role: "member" as const, rank: "skipper" as const };
  it("skippers administer helms only", () => {
    expect(canAdminister(skipper, "helms")).toBe(true);
    expect(canAdminister(skipper, "sr_helms")).toBe(false);
  });
  it("committee and admin administer everything", () => {
    for (const role of ["committee", "admin"] as const)
      for (const t of TESTS) expect(canAdminister({ id: 2, role, rank: "novice" }, t.key)).toBe(true);
  });
  it("helms and novices administer nothing and only view themselves", () => {
    const h = { id: 3, role: "member" as const, rank: "helms" as const };
    expect(TESTS.some((t) => canAdminister(h, t.key))).toBe(false);
    expect(canViewMember(h, 3)).toBe(true);
    expect(canViewMember(h, 4)).toBe(false);
  });
  it("enforces the progression", () => {
    const by = Object.fromEntries(TESTS.map((t) => [t.key, t]));
    const c = (rank: any, endorsements: any[] = []) => ({ id: 9, rank, endorsements });
    expect(isEligible(by.helms, c("novice"))).toBe(true);
    expect(isEligible(by.helms, c("helms"))).toBe(false);
    expect(isEligible(by.sr_helms, c("novice"))).toBe(false);
    expect(isEligible(by.sr_helms, c("helms"))).toBe(true);
    expect(isEligible(by.skipper, c("helms"))).toBe(false);
    expect(isEligible(by.skipper, c("sr_helms"))).toBe(true);
    expect(isEligible(by.hobie, c("novice"))).toBe(false);
    expect(isEligible(by.hobie, c("helms"))).toBe(true);
    expect(isEligible(by.hobie, c("sr_helms", ["hobie"]))).toBe(false);
    expect(isEligible(by.laser_only, c("novice"))).toBe(true);
    expect(isEligible(by.laser, c("skipper"))).toBe(true);
  });
});

describe("progress", () => {
  it("counts signed items", () => {
    const t = TESTS.find((x) => x.key === "laser")!;
    const keys = allItems(t).map((i) => i.key);
    expect(computeProgress(t, []).percent).toBe(0);
    expect(computeProgress(t, keys.slice(0, 1)).percent).toBe(33);
    expect(computeProgress(t, keys).complete).toBe(true);
  });
});

describe("sheet editing", () => {
  const helms = TESTS.find((t) => t.key === "helms")!;
  it("round-trips the handbook sheet unchanged (keys preserved)", () => {
    const r = validateSheet(JSON.parse(JSON.stringify(helms)));
    expect(r.ok).toBe(true);
    if (r.ok) expect(allItems(r.content).map((i) => i.key)).toEqual(allItems(helms).map((i) => i.key));
  });
  it("keeps a reworded item's key and gives new items unique keys", () => {
    const c = JSON.parse(JSON.stringify(helms));
    c.sections[0].items[0].title = "Reworded";
    c.sections[0].items.push({ key: "", title: "KNOTS", details: [] }); // clashes with existing KNOTS key
    const r = validateSheet(c);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const keys = allItems(r.content).map((i) => i.key);
    expect(keys[0]).toBe("leaves_from_and_returns_to_dock");
    expect(new Set(keys).size).toBe(keys.length);
  });
  it("rejects empty sections and bad wind", () => {
    expect(validateSheet({ title: "x", notes: [], sections: [{ title: "s", items: [] }] }).ok).toBe(false);
    expect(validateSheet({ ...helms, minBaseWind: 99 }).ok).toBe(false);
  });
});

describe("password change", () => {
  it("accepts a new 8+ character password that matches its confirmation", () => {
    expect(validatePasswordChange("temporary1", "my-new-pass", "my-new-pass")).toBeNull();
  });
  it("rejects a missing current password, short or mismatched new passwords, and reuse", () => {
    expect(validatePasswordChange("", "my-new-pass", "my-new-pass")).toMatch(/current password/);
    expect(validatePasswordChange("temporary1", "short", "short")).toMatch(/at least 8/);
    expect(validatePasswordChange("temporary1", "my-new-pass", "my-new-pazz")).toMatch(/don't match/);
    expect(validatePasswordChange("temporary1", "temporary1", "temporary1")).toMatch(/different/);
  });
});
