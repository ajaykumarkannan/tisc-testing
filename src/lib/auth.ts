import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { cache } from "react";
import { one, query } from "./db";
import type { Actor, Role } from "./permissions";
import { effectiveEndorsements, type Endorsement, type Rank } from "./tests";

const COOKIE = "tisc_session";
const VIEW_AS_COOKIE = "tisc_view_as";
const MAX_AGE = 60 * 60 * 24 * 14;

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw new Error("SESSION_SECRET must be set (16+ chars)");
  return new TextEncoder().encode(s);
}

/** Signs a session for the user's current session_version. Bumping session_version invalidates older cookies. */
export async function startSession(userId: number) {
  const row = await one<{ session_version: number }>("SELECT session_version FROM users WHERE id=$1", [userId]);
  const token = await new SignJWT({ sv: row?.session_version ?? 0 }).setProtectedHeader({ alg: "HS256" }).setSubject(String(userId))
    .setIssuedAt().setExpirationTime(`${MAX_AGE}s`).sign(secret());
  (await cookies()).set(COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: MAX_AGE });
}
export async function endSession() {
  const c = await cookies();
  c.delete(COOKIE);
  c.delete(VIEW_AS_COOKIE);
}

/** Admin "view as": a signed cookie naming the member to view as and the admin who started it. */
export async function startViewAs(adminId: number, targetId: number) {
  const token = await new SignJWT({ by: adminId }).setProtectedHeader({ alg: "HS256" }).setSubject(String(targetId))
    .setIssuedAt().setExpirationTime("8h").sign(secret());
  (await cookies()).set(VIEW_AS_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 8 * 3600 });
}
export async function stopViewAs() {
  (await cookies()).delete(VIEW_AS_COOKIE);
}

export interface User extends Actor {
  email: string;
  name: string;
  endorsements: Endorsement[];
  mustChangePassword: boolean;
  sessionVersion: number;
  /** Tests opened for this member by testing-committee exception. */
  exceptions: string[];
  /** Set when an admin is viewing the app as this member. Everything is read-only then. */
  viewedBy?: { id: number; name: string };
}

/**
 * The user the app should render as: normally the signed-in user, or, when an admin has started
 * "view as", the member being viewed (with `viewedBy` set).
 */
export const getUser = cache(async (): Promise<User | null> => {
  const real = await getRealUser();
  if (!real || real.role !== "admin") return real;
  const token = (await cookies()).get(VIEW_AS_COOKIE)?.value;
  if (!token) return real;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.by !== real.id) return real; // only the admin who started it
    const target = await loadUser(Number(payload.sub));
    if (!target || target.id === real.id) return real;
    return { ...target, viewedBy: { id: real.id, name: real.name } };
  } catch {
    return real;
  }
});

/** The signed-in user (never the viewed-as member). Re-read from the DB each request so role/rank changes apply at once. */
export const getRealUser = cache(async (): Promise<User | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  let id: number, sv: unknown;
  try {
    const { payload } = await jwtVerify(token, secret());
    id = Number(payload.sub);
    sv = payload.sv ?? 0; // cookies issued before session versions existed count as version 0
  } catch {
    return null;
  }
  const u = await loadUser(id);
  // A password change bumps session_version, which signs out every session issued before it.
  return u && u.sessionVersion === sv ? u : null;
});

export async function loadUser(id: number): Promise<User | null> {
  const r = await one<{ id: number; email: string; name: string; role: Role; rank: Rank; must_change_password: boolean; session_version: number }>(
    "SELECT id,email,name,role,rank,must_change_password,session_version FROM users WHERE id=$1", [id]);
  if (!r) return null;
  const { must_change_password, session_version, ...u } = r;
  const [e, x] = await Promise.all([
    query<{ endorsement: Endorsement }>("SELECT endorsement FROM endorsements WHERE user_id=$1", [id]),
    query<{ test_key: string }>("SELECT test_key FROM test_exceptions WHERE user_id=$1", [id]),
  ]);
  return { ...u, endorsements: effectiveEndorsements(u.rank, e.map((x) => x.endorsement)), exceptions: x.map((r) => r.test_key), mustChangePassword: must_change_password, sessionVersion: session_version };
}

/**
 * The signed-in user, or a redirect to /login. Accounts with an admin-set (temporary) password are sent to
 * /account until they choose their own; only the account page and its action pass `allowPendingPasswordChange`.
 * Sign-out doesn't call this, so it always works.
 */
export async function requireUser(opts: { allowPendingPasswordChange?: boolean } = {}): Promise<User> {
  const u = await getUser();
  if (!u) redirect("/login");
  if (u.mustChangePassword && !opts.allowPendingPasswordChange && !u.viewedBy) redirect("/account?forced=1");
  return u;
}

/**
 * For server actions that change anything: the signed-in user, refusing while an admin is viewing as
 * someone else (so nothing can be signed or edited under another member's name).
 */
export async function requireActor(opts: { allowPendingPasswordChange?: boolean } = {}): Promise<User> {
  const u = await requireUser(opts);
  if (u.viewedBy) redirect("/?error=" + encodeURIComponent(`You're viewing as ${u.name}. Stop viewing to make changes.`));
  return u;
}
/** Admin pages: the rendered user must be an admin (so "view as" a member hides admin pages). */
export async function requireAdmin(): Promise<User> {
  const u = await requireUser();
  if (u.role !== "admin") redirect("/");
  return u;
}
/** Admin actions: must be an admin and not currently viewing as someone. */
export async function requireAdminActor(): Promise<User> {
  const u = await requireActor();
  if (u.role !== "admin") redirect("/");
  return u;
}
