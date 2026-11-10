import { query } from "./db";

export interface Signoff {
  item_key: string;
  examiner_id: number;
  examiner_name: string;
  signed_at: Date;
  credit: string | null;
  note: string | null;
}
export interface Completion {
  test_key: string;
  sheet_version: string;
  completed_at: Date;
  final_examiner_name: string;
}

export const getSignoffs = (userId: number, testKey: string) =>
  query<Signoff>(
    `SELECT s.item_key, s.examiner_id, u.name AS examiner_name, s.signed_at, s.credit, s.note
       FROM signoffs s JOIN users u ON u.id = s.examiner_id
      WHERE s.user_id=$1 AND s.test_key=$2`, [userId, testKey]);

/** item keys signed per test, for progress bars */
export async function signedByTest(userId: number): Promise<Record<string, string[]>> {
  const rows = await query<{ test_key: string; item_key: string }>("SELECT test_key,item_key FROM signoffs WHERE user_id=$1", [userId]);
  const out: Record<string, string[]> = {};
  for (const r of rows) (out[r.test_key] ??= []).push(r.item_key);
  return out;
}

export const getCompletions = (userId: number) =>
  query<Completion>(
    `SELECT c.test_key, c.sheet_version, c.completed_at, u.name AS final_examiner_name
       FROM completions c JOIN users u ON u.id = c.final_examiner_id
      WHERE c.user_id=$1 ORDER BY c.completed_at`, [userId]);

export const fmtDate = (d: Date | string) =>
  new Date(d).toLocaleDateString("en-CA", { timeZone: "America/Toronto", year: "numeric", month: "short", day: "numeric" });

export interface RecentSignoff {
  test_key: string;
  item_key: string;
  examiner_name: string;
  signed_at: Date;
  credit: string | null;
  note: string | null;
}
/** Most recent sign-offs on a member's sheets (read-only; for the history list). */
export const recentSignoffs = (userId: number, limit = 8) =>
  query<RecentSignoff>(
    `SELECT s.test_key, s.item_key, u.name AS examiner_name, s.signed_at, s.credit, s.note
       FROM signoffs s JOIN users u ON u.id = s.examiner_id
      WHERE s.user_id=$1 ORDER BY s.signed_at DESC LIMIT $2`, [userId, limit]);
