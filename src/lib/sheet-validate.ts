import { CREDIT_KINDS, slug, type Item, type Section, type SheetContent } from "./tests";

const s = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/**
 * Validates and normalises sheet content submitted from the editor.
 * Existing item keys are kept (so sign-offs stay attached); new items get a unique key from their title.
 */
export function validateSheet(input: unknown): { ok: true; content: SheetContent } | { ok: false; error: string } {
  if (!input || typeof input !== "object") return { ok: false, error: "Invalid sheet" };
  const raw = input as Record<string, unknown>;
  const title = s(raw.title, 80);
  if (!title) return { ok: false, error: "The sheet needs a title" };
  const mbw = raw.minBaseWind === "" || raw.minBaseWind == null ? undefined : Number(raw.minBaseWind);
  if (mbw !== undefined && (!Number.isInteger(mbw) || mbw < 0 || mbw > 20)) return { ok: false, error: "Min base wind must be a whole number 0–20" };
  const notes = (Array.isArray(raw.notes) ? raw.notes : []).map((n) => s(n, 500)).filter(Boolean);
  if (!Array.isArray(raw.sections) || raw.sections.length === 0) return { ok: false, error: "The sheet needs at least one section" };

  const itemKeys = new Set<string>(), sectionKeys = new Set<string>();
  const unique = (base: string, used: Set<string>) => {
    let k = base || "item", n = 2;
    while (used.has(k)) k = `${base}_${n++}`;
    used.add(k);
    return k;
  };
  const sections: Section[] = [];
  for (const rs of raw.sections as any[]) {
    const stitle = s(rs?.title, 120);
    if (!stitle) return { ok: false, error: "Every section needs a title" };
    if (!Array.isArray(rs.items) || rs.items.length === 0) return { ok: false, error: `Section "${stitle}" has no items` };
    const items: Item[] = [];
    for (const ri of rs.items as any[]) {
      const ititle = s(ri?.title, 200);
      if (!ititle) return { ok: false, error: `An item in "${stitle}" has no title` };
      const credit = CREDIT_KINDS.includes(ri.credit) ? ri.credit : undefined;
      const details = (Array.isArray(ri.details) ? ri.details : []).map((d: unknown) => s(d, 500)).filter(Boolean).slice(0, 30);
      const existing = typeof ri.key === "string" && /^[a-z0-9_]{1,70}$/.test(ri.key) && !itemKeys.has(ri.key) ? ri.key : null;
      const key = existing ?? unique(slug(ititle), itemKeys);
      itemKeys.add(key);
      items.push({ key, title: ititle, details, ...(credit ? { credit } : {}) });
    }
    const note = s(rs.note, 500);
    sections.push({ key: unique(slug(stitle), sectionKeys), title: stitle, ...(note ? { note } : {}), items });
  }
  if (itemKeys.size > 100) return { ok: false, error: "Too many items" };
  return { ok: true, content: { title, ...(mbw !== undefined ? { minBaseWind: mbw } : {}), notes, sections } };
}
