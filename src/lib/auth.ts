import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { cache } from "react";
import { one, query } from "./db";
import type { Actor, Role } from "./permissions";
import type { Endorsement, Rank } from "./tests";

const COOKIE = "tisc_session";
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
  (await cookies()).delete(COOKIE);
}

export interface User extends Actor {
  email: string;
  name: string;
  endorsements: Endorsement[];
  mustChangePassword: boolean;
  sessionVersion: number;
}

/** Re-reads the user from the DB each request so role/rank changes take effect at once. */
export const getUser = cache(async (): Promise<User | null> => {
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
  const e = await query<{ endorsement: Endorsement }>("SELECT endorsement FROM endorsements WHERE user_id=$1", [id]);
  return { ...u, endorsements: e.map((x) => x.endorsement), mustChangePassword: must_change_password, sessionVersion: session_version };
}

/**
 * The signed-in user, or a redirect to /login. Accounts with an admin-set (temporary) password are sent to
 * /account until they choose their own; only the account page and its action pass `allowPendingPasswordChange`.
 * Sign-out doesn't call this, so it always works.
 */
export async function requireUser(opts: { allowPendingPasswordChange?: boolean } = {}): Promise<User> {
  const u = await getUser();
  if (!u) redirect("/login");
  if (u.mustChangePassword && !opts.allowPendingPasswordChange) redirect("/account?forced=1");
  return u;
}
export async function requireAdmin(): Promise<User> {
  const u = await requireUser();
  if (u.role !== "admin") redirect("/");
  return u;
}
