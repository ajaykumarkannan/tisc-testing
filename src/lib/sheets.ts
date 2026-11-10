import { cache } from "react";
import { query } from "./db";
import { DEFAULT_BY_KEY, RULES_BY_KEY, TEST_KEYS, type SheetContent, type TestDef } from "./tests";

/** Current sheet = fixed rules from code + content (committee edit from DB, else handbook default). */
export const getSheets = cache(async (): Promise<Record<string, TestDef>> => {
  const rows = await query<{ test_key: string; revision: number; content: SheetContent }>(
    "SELECT test_key, revision, content FROM test_sheets");
  const out: Record<string, TestDef> = { ...DEFAULT_BY_KEY };
  for (const r of rows) if (RULES_BY_KEY[r.test_key]) out[r.test_key] = { ...RULES_BY_KEY[r.test_key], ...r.content, revision: r.revision };
  return out;
});
export const getSheet = async (key: string): Promise<TestDef | null> => (await getSheets())[key] ?? null;
export const sheetList = async () => { const all = await getSheets(); return TEST_KEYS.map((k) => all[k]); };
export const versionLabel = (t: TestDef) => (t.revision ? `${t.sheetVersion} rev ${t.revision}` : t.sheetVersion);
