import { allItems, type SheetContent } from "./tests";

export interface Progress {
  done: number;
  total: number;
  percent: number;
  complete: boolean;
  missing: string[];
}

export function computeProgress(test: Pick<SheetContent, "sections">, signedKeys: Iterable<string>): Progress {
  const signed = new Set(signedKeys);
  const items = allItems(test);
  const done = items.filter((i) => signed.has(i.key)).length;
  const total = items.length;
  return {
    done,
    total,
    percent: total ? Math.round((done / total) * 100) : 0,
    complete: done === total,
    missing: items.filter((i) => !signed.has(i.key)).map((i) => i.key),
  };
}
