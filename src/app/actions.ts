"use server";

import bcrypt from "bcryptjs";
import { timingSafeEqual } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { endSession, loadUser, requireAdmin, requireUser, startSession } from "@/lib/auth";
import { one, query, tx } from "@/lib/db";
import { canAdminister, canEditSheets, isEligible } from "@/lib/permissions";
import { computeProgress } from "@/lib/progress";
import { ENDORSEMENTS, RANKS, RULES_BY_KEY, allItems, type CreditKind } from "@/lib/tests";
import { getSheet, versionLabel } from "@/lib/sheets";
import { validateSheet } from "@/lib/sheet-validate";
import { validatePasswordChange } from "@/lib/password";

/** The only email allowed to create the first admin account. */
const adminEmail = () => (process.env.ADMIN_EMAIL || "commodore@torontosailing.com").trim();
const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const num = (f: FormData, k: string) => Number(f.get(k));
const fail = (path: string, msg: string): never => redirect(`${path}${path.includes("?") ? "&" : "?"}error=${encodeURIComponent(msg)}`);

// ---------- auth ----------
// A real bcrypt hash, so a login for an unknown email costs the same time as a real one.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10);
const LOCK_MINUTES = 15, MAX_PER_EMAIL = 5, MAX_PER_IP = 30;

async function clientIp() {
  const h = await headers();
  return (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "unknown";
}

export async function login(f: FormData) {
  const email = str(f, "email").toLowerCase();
  const ip = await clientIp();
  const recent = await one<{ by_email: number; by_ip: number }>(
    `SELECT count(*) FILTER (WHERE email=$1)::int AS by_email, count(*) FILTER (WHERE ip=$2)::int AS by_ip
       FROM login_failures WHERE at > now() - make_interval(mins => $3)`, [email, ip, LOCK_MINUTES]);
  if (recent && (recent.by_email >= MAX_PER_EMAIL || recent.by_ip >= MAX_PER_IP))
    return fail("/login", `Too many failed attempts. Try again in ${LOCK_MINUTES} minutes.`);
  const u = await one<{ id: number; password_hash: string; must_change_password: boolean }>(
    "SELECT id,password_hash,must_change_password FROM users WHERE lower(email)=$1", [email]);
  const ok = await bcrypt.compare(str(f, "password"), u?.password_hash ?? DUMMY_HASH);
  if (!u || !ok) {
    await query("INSERT INTO login_failures (email, ip) VALUES ($1,$2)", [email.slice(0, 200), ip.slice(0, 100)]);
    await query("DELETE FROM login_failures WHERE at < now() - interval '1 day'");
    return fail("/login", "Invalid email or password");
  }
  await query("DELETE FROM login_failures WHERE email=$1", [email]);
  await startSession(u.id);
  redirect(u.must_change_password ? "/account?forced=1" : "/");
}
export async function logout() {
  await endSession();
  redirect("/login");
}
export async function signup(f: FormData) {
  if (process.env.ALLOW_SIGNUP !== "true") fail("/login", "Sign-up is disabled");
  const [name, email, password] = [str(f, "name"), str(f, "email"), str(f, "password")];
  if (!name || !email.includes("@") || password.length < 8) fail("/signup", "Name, a valid email and an 8+ character password are required");
  const r = await one<{ id: number }>(
    "INSERT INTO users (email,name,password_hash) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING RETURNING id",
    [email, name, await bcrypt.hash(password, 10)]);
  if (!r) fail("/signup", "That email is already registered");
  await startSession(r!.id);
  redirect("/");
}

/**
 * The setup code is SETUP_TOKEN if set, otherwise SESSION_SECRET. Only someone with access to the
 * Vercel project knows it, so nobody else can claim the admin account on a fresh deploy.
 */
function setupCodeMatches(code: string) {
  const expected = process.env.SETUP_TOKEN || process.env.SESSION_SECRET || "";
  const a = Buffer.from(code), b = Buffer.from(expected);
  return expected.length >= 16 && a.length === b.length && timingSafeEqual(a, b);
}

/** One-time creation of the first admin. Needs the setup code; only works while no admin exists, only for ADMIN_EMAIL. */
export async function setupAdmin(f: FormData) {
  const expected = adminEmail().toLowerCase();
  const [name, email, password] = [str(f, "name"), str(f, "email"), str(f, "password")];
  if (!setupCodeMatches(str(f, "code"))) return fail("/setup", "Incorrect setup code");
  if (email.toLowerCase() !== expected) return fail("/setup", "That email is not the designated administrator email");
  if (!name || password.length < 8) return fail("/setup", "Name and an 8+ character password are required");
  const hash = await bcrypt.hash(password, 10);
  const id = await tx(async (c) => {
    await c.query("LOCK TABLE users IN EXCLUSIVE MODE");
    const r = await c.query(
      `INSERT INTO users (email,name,password_hash,role) SELECT $1,$2,$3,'admin'
        WHERE NOT EXISTS (SELECT 1 FROM users WHERE role='admin' OR lower(email)=lower($1)) RETURNING id`,
      [email, name, hash]);
    return r.rows[0]?.id as number | undefined;
  });
  if (!id) return fail("/login", "Setup has already been completed");
  await startSession(id);
  redirect("/");
}

// ---------- own account ----------
/** Any signed-in user changes their own password. Signs out their other sessions and clears a forced change. */
export async function changePassword(f: FormData) {
  const me = await requireUser({ allowPendingPasswordChange: true });
  // Trimmed like every other password field (login compares the trimmed value).
  const [current, next, confirm] = ["current_password", "new_password", "confirm_password"].map((k) => str(f, k));
  const err = validatePasswordChange(current, next, confirm);
  if (err) return fail("/account", err);
  const row = await one<{ password_hash: string }>("SELECT password_hash FROM users WHERE id=$1", [me.id]);
  if (!row || !(await bcrypt.compare(current, row.password_hash))) return fail("/account", "Current password is incorrect");
  await query("UPDATE users SET password_hash=$2, must_change_password=false, session_version=session_version+1 WHERE id=$1",
    [me.id, await bcrypt.hash(next, 10)]);
  await startSession(me.id); // re-issue this session at the new version; every other session is now invalid
  revalidatePath("/", "layout");
  redirect(me.mustChangePassword ? "/?password=changed" : "/account?changed=1");
}

// ---------- testing ----------
export async function signItem(f: FormData) {
  const actor = await requireUser();
  const [userId, testKey, itemKey] = [num(f, "userId"), str(f, "testKey"), str(f, "itemKey")];
  const back = `/members/${userId}/${testKey}`;
  const test = await getSheet(testKey);
  const item = test && allItems(test).find((i) => i.key === itemKey);
  if (!test || !item) return fail(back, "Unknown test item");
  if (!canAdminister(actor, testKey)) return fail(back, "You are not authorised to administer this test");
  if (actor.id === userId) return fail(back, "You cannot sign off your own test");
  const cand = await loadUser(userId);
  if (!cand || !isEligible(test, cand)) return fail(back, "Member is not eligible for this test");
  const wantsCredit = f.get("credit") === "on";
  if (wantsCredit && !item.credit) return fail(back, "This item has no credit option");
  const credit: CreditKind | null = wantsCredit ? item.credit! : null;
  // Credits are confirmed by the committee / admin only.
  if (credit && actor.role === "member") return fail(back, "Only testing committee members can record credits");
  await query(
    `INSERT INTO signoffs (user_id,test_key,sheet_version,item_key,examiner_id,credit,note)
     VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (user_id,test_key,item_key) DO NOTHING`,
    [userId, testKey, versionLabel(test), itemKey, actor.id, credit, str(f, "note").slice(0, 500) || null]);
  revalidatePath(back);
  revalidatePath("/");
}

export async function unsignItem(f: FormData) {
  const actor = await requireUser();
  const [userId, testKey, itemKey] = [num(f, "userId"), str(f, "testKey"), str(f, "itemKey")];
  const back = `/members/${userId}/${testKey}`;
  if (!canAdminister(actor, testKey)) return fail(back, "Not authorised");
  if (actor.id === userId) return fail(back, "You cannot change sign-offs on your own test");
  if (await one("SELECT 1 FROM completions WHERE user_id=$1 AND test_key=$2", [userId, testKey])) return fail(back, "Test already completed");
  const s = await one<{ examiner_id: number }>("SELECT examiner_id FROM signoffs WHERE user_id=$1 AND test_key=$2 AND item_key=$3", [userId, testKey, itemKey]);
  if (!s) return;
  if (s.examiner_id !== actor.id && actor.role === "member") return fail(back, "Only the examiner who signed (or the testing committee) can remove a sign-off");
  await query("DELETE FROM signoffs WHERE user_id=$1 AND test_key=$2 AND item_key=$3", [userId, testKey, itemKey]);
  revalidatePath(back);
}

export async function completeTest(f: FormData) {
  const actor = await requireUser();
  const [userId, testKey] = [num(f, "userId"), str(f, "testKey")];
  const back = `/members/${userId}/${testKey}`;
  const test = await getSheet(testKey);
  if (!test) return fail(back, "Unknown test");
  if (!canAdminister(actor, testKey)) return fail(back, "Not authorised");
  if (actor.id === userId) return fail(back, "You cannot complete your own test");

  try {
    await tx(async (client) => {
      // Lock the candidate row so concurrent completions can't double-apply.
      await client.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [userId]);
      const cand = await loadUser(userId);
      if (!cand || !isEligible(test, cand)) throw new Error("Member is not eligible for this test");
      const signed = await client.query("SELECT item_key FROM signoffs WHERE user_id=$1 AND test_key=$2", [userId, testKey]);
      if (!computeProgress(test, signed.rows.map((r) => r.item_key)).complete) throw new Error("Not every item is signed off yet");
      await client.query(
        "INSERT INTO completions (user_id,test_key,sheet_version,final_examiner_id) VALUES ($1,$2,$3,$4)",
        [userId, testKey, versionLabel(test), actor.id]);
      if (test.grants.rank) await client.query("UPDATE users SET rank=$2 WHERE id=$1", [userId, test.grants.rank]);
      if (test.grants.endorsement)
        await client.query("INSERT INTO endorsements (user_id,endorsement) VALUES ($1,$2) ON CONFLICT DO NOTHING", [userId, test.grants.endorsement]);
    });
  } catch (e) {
    return fail(back, e instanceof Error ? e.message : "Could not complete test");
  }
  revalidatePath("/", "layout");
  redirect(`${back}?completed=1`);
}

// ---------- admin ----------
export async function createUser(f: FormData) {
  await requireAdmin();
  const [name, email, password] = [str(f, "name"), str(f, "email"), str(f, "password")];
  const role = str(f, "role"), rank = str(f, "rank");
  if (!name || !email.includes("@") || password.length < 8) return fail("/admin/users", "Name, valid email and 8+ character password required");
  if (!["admin", "committee", "member"].includes(role) || !RANKS.includes(rank as any)) return fail("/admin/users", "Invalid role or rank");
  const r = await one<{ id: number }>(
    // The admin chose a temporary password, so the member must pick their own on first sign-in.
    "INSERT INTO users (email,name,password_hash,role,rank,must_change_password) VALUES ($1,$2,$3,$4,$5,true) ON CONFLICT DO NOTHING RETURNING id",
    [email, name, await bcrypt.hash(password, 10), role, rank]);
  if (!r) return fail("/admin/users", "Email already exists");
  revalidatePath("/admin/users");
}

export async function updateUser(f: FormData) {
  const admin = await requireAdmin();
  const id = num(f, "userId");
  const role = str(f, "role"), rank = str(f, "rank");
  if (!["admin", "committee", "member"].includes(role) || !RANKS.includes(rank as any)) return fail("/admin/users", "Invalid role or rank");
  if (id === admin.id && role !== "admin") return fail("/admin/users", "You can't remove your own admin role");
  await query("UPDATE users SET role=$2, rank=$3, name=$4 WHERE id=$1", [id, role, rank, str(f, "name") || "Unnamed"]);
  for (const e of ENDORSEMENTS) {
    if (f.get(`end_${e}`) === "on")
      await query("INSERT INTO endorsements (user_id,endorsement) VALUES ($1,$2) ON CONFLICT DO NOTHING", [id, e]);
    else await query("DELETE FROM endorsements WHERE user_id=$1 AND endorsement=$2", [id, e]);
  }
  const pw = str(f, "password");
  if (pw) {
    if (pw.length < 8) return fail("/admin/users", "Password must be 8+ characters");
    // A password set for someone else is temporary: they must change it, and their existing sessions end.
    await query("UPDATE users SET password_hash=$2, must_change_password=$3, session_version=session_version+1 WHERE id=$1",
      [id, await bcrypt.hash(pw, 10), id !== admin.id]);
    if (id === admin.id) await startSession(id); // keep the admin signed in after resetting their own password
  }
  revalidatePath("/admin/users");
}

// ---------- sheet editing (testing committee) ----------
export async function saveSheet(f: FormData) {
  const actor = await requireUser();
  const testKey = str(f, "testKey");
  const back = `/sheets/${testKey}`;
  if (!canEditSheets(actor)) return fail("/", "Only the testing committee can edit sheets");
  if (!Object.hasOwn(RULES_BY_KEY, testKey)) return fail("/sheets", "Unknown sheet");
  let parsed: unknown;
  try { parsed = JSON.parse(String(f.get("content") ?? "")); } catch { return fail(back, "Could not read the sheet"); }
  const v = validateSheet(parsed);
  if (!v.ok) return fail(back, v.error);
  const baseRevision = num(f, "revision");
  try {
    await tx(async (client) => {
      const cur = await client.query("SELECT revision FROM test_sheets WHERE test_key=$1 FOR UPDATE", [testKey]);
      const current = cur.rows[0]?.revision ?? 0;
      if (current !== baseRevision) throw new Error("Someone else saved this sheet while you were editing. Reload and try again.");
      const next = current + 1;
      await client.query(
        `INSERT INTO test_sheets (test_key,revision,content,updated_by,updated_at) VALUES ($1,$2,$3,$4,now())
         ON CONFLICT (test_key) DO UPDATE SET revision=$2, content=$3, updated_by=$4, updated_at=now()`,
        [testKey, next, JSON.stringify(v.content), actor.id]);
      await client.query("INSERT INTO test_sheet_revisions (test_key,revision,content,updated_by) VALUES ($1,$2,$3,$4)",
        [testKey, next, JSON.stringify(v.content), actor.id]);
    });
  } catch (e) {
    return fail(back, e instanceof Error ? e.message : "Could not save");
  }
  revalidatePath("/", "layout");
  redirect(`${back}?saved=1`);
}

/** Restores the handbook text, recorded as a new revision so history is kept. */
export async function resetSheet(f: FormData) {
  const actor = await requireUser();
  const testKey = str(f, "testKey");
  if (!canEditSheets(actor)) return fail("/", "Only the testing committee can edit sheets");
  const { DEFAULT_BY_KEY, contentOf } = await import("@/lib/tests");
  const def = Object.hasOwn(DEFAULT_BY_KEY, testKey) ? DEFAULT_BY_KEY[testKey] : null;
  if (!def) return fail("/sheets", "Unknown sheet");
  const fd = new FormData();
  fd.set("testKey", testKey);
  fd.set("revision", String(num(f, "revision")));
  fd.set("content", JSON.stringify(contentOf(def)));
  return saveSheet(fd);
}
