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

export async function startSession(userId: number) {
  const token = await new SignJWT({}).setProtectedHeader({ alg: "HS256" }).setSubject(String(userId))
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
}

/** Re-reads the user from the DB each request so role/rank changes take effect at once. */
export const getUser = cache(async (): Promise<User | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  let id: number;
  try {
    id = Number((await jwtVerify(token, secret())).payload.sub);
  } catch {
    return null;
  }
  return loadUser(id);
});

export async function loadUser(id: number): Promise<User | null> {
  const u = await one<{ id: number; email: string; name: string; role: Role; rank: Rank }>(
    "SELECT id,email,name,role,rank FROM users WHERE id=$1", [id]);
  if (!u) return null;
  const e = await query<{ endorsement: Endorsement }>("SELECT endorsement FROM endorsements WHERE user_id=$1", [id]);
  return { ...u, endorsements: e.map((x) => x.endorsement) };
}

export async function requireUser(): Promise<User> {
  const u = await getUser();
  if (!u) redirect("/login");
  return u;
}
export async function requireAdmin(): Promise<User> {
  const u = await requireUser();
  if (u.role !== "admin") redirect("/");
  return u;
}
