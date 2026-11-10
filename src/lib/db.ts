import pg from "pg";
import { SCHEMA_SQL } from "./schema";

const g = globalThis as unknown as { __pool?: pg.Pool; __schema?: Promise<void> };

function make(): pg.Pool {
  // Vercel's Neon integration sets DATABASE_URL (pooled). POSTGRES_URL is a fallback name it may also set.
  const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const local = /localhost|127\.0\.0\.1/.test(url);
  return new pg.Pool({ connectionString: url, max: 5, idleTimeoutMillis: 10_000, ssl: local ? false : { rejectUnauthorized: true } });
}

/** Pool with the schema guaranteed to exist (runs CREATE ... IF NOT EXISTS once per instance). */
export async function db(): Promise<pg.Pool> {
  const p = (g.__pool ??= make());
  g.__schema ??= p.query(SCHEMA_SQL).then(() => undefined).catch((e) => { g.__schema = undefined; throw e; });
  await g.__schema;
  return p;
}

export async function query<T extends pg.QueryResultRow = any>(text: string, params: unknown[] = []): Promise<T[]> {
  try {
    return (await (await db()).query<T>(text, params)).rows;
  } catch (e) {
    // Table missing (e.g. database was reset): re-apply the schema once and retry.
    if ((e as { code?: string }).code !== "42P01") throw e;
    g.__schema = undefined;
    return (await (await db()).query<T>(text, params)).rows;
  }
}
export async function one<T extends pg.QueryResultRow = any>(text: string, params: unknown[] = []): Promise<T | null> {
  return (await query<T>(text, params))[0] ?? null;
}
/** Runs fn in a transaction. */
export async function tx<T>(fn: (c: pg.PoolClient) => Promise<T>): Promise<T> {
  const c = await (await db()).connect();
  try {
    await c.query("BEGIN");
    const r = await fn(c);
    await c.query("COMMIT");
    return r;
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  } finally {
    c.release();
  }
}
