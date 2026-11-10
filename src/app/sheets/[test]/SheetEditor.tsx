"use client";

import { useState } from "react";
import { CREDIT_KINDS, CREDIT_LABEL, type Item, type Section, type SheetContent } from "@/lib/tests";

type Props = { testKey: string; revision: number; initial: SheetContent; action: (f: FormData) => Promise<void> };

const move = <T,>(arr: T[], i: number, d: number) => {
  const j = i + d;
  if (j < 0 || j >= arr.length) return arr;
  const c = [...arr];
  [c[i], c[j]] = [c[j], c[i]];
  return c;
};
const newItem = (): Item => ({ key: "", title: "NEW ITEM", details: [] });

export function SheetEditor({ testKey, revision, initial, action }: Props) {
  const [s, setS] = useState<SheetContent>(initial);
  const [dirty, setDirty] = useState(false);
  const update = (fn: (c: SheetContent) => SheetContent) => { setS(fn); setDirty(true); };
  const setSection = (si: number, fn: (x: Section) => Section) =>
    update((c) => ({ ...c, sections: c.sections.map((x, i) => (i === si ? fn(x) : x)) }));
  const setItem = (si: number, ii: number, fn: (x: Item) => Item) =>
    setSection(si, (sec) => ({ ...sec, items: sec.items.map((x, i) => (i === ii ? fn(x) : x)) }));

  return (
    <form action={action}>
      <input type="hidden" name="testKey" value={testKey} />
      <input type="hidden" name="revision" value={revision} />
      <input type="hidden" name="content" value={JSON.stringify(s)} />

      <div className="card">
        <div className="row">
          <label className="grow"><span>Sheet title</span>
            <input value={s.title} onChange={(e) => update((c) => ({ ...c, title: e.target.value }))} style={{ width: "100%" }} /></label>
          <label><span>Min base wind</span>
            <input type="number" min={0} max={20} value={s.minBaseWind ?? ""} style={{ width: 90 }}
              onChange={(e) => update((c) => ({ ...c, minBaseWind: e.target.value === "" ? undefined : Number(e.target.value) }))} /></label>
        </div>
        <label><span>Notes at the top of the sheet (one per line)</span>
          <textarea rows={4} value={s.notes.join("\n")} onChange={(e) => update((c) => ({ ...c, notes: e.target.value.split("\n") }))} /></label>
      </div>

      {s.sections.map((sec, si) => (
        <div key={si} className="ed-section">
          <div className="row ed-head">
            <input className="grow" value={sec.title} aria-label="Section title" style={{ fontWeight: 700 }}
              onChange={(e) => setSection(si, (x) => ({ ...x, title: e.target.value }))} />
            <button type="button" className="secondary" onClick={() => update((c) => ({ ...c, sections: move(c.sections, si, -1) }))} aria-label="Move section up">↑</button>
            <button type="button" className="secondary" onClick={() => update((c) => ({ ...c, sections: move(c.sections, si, 1) }))} aria-label="Move section down">↓</button>
            <button type="button" className="danger" onClick={() => confirm("Delete this section and its items?") &&
              update((c) => ({ ...c, sections: c.sections.filter((_, i) => i !== si) }))}>Delete section</button>
          </div>
          <label style={{ marginTop: 8 }}><span>Section note (optional)</span>
            <input value={sec.note ?? ""} style={{ width: "100%" }} onChange={(e) => setSection(si, (x) => ({ ...x, note: e.target.value }))} /></label>

          {sec.items.map((it, ii) => (
            <div key={it.key || `new-${ii}`} className="ed-item">
              <div className="row ed-head">
                <input className="grow" value={it.title} aria-label="Item title" onChange={(e) => setItem(si, ii, (x) => ({ ...x, title: e.target.value }))} />
                <select value={it.credit ?? ""} aria-label="Automatic credit"
                  onChange={(e) => setItem(si, ii, (x) => ({ ...x, credit: (e.target.value || undefined) as Item["credit"] }))}>
                  <option value="">No automatic credit</option>
                  {CREDIT_KINDS.map((k) => <option key={k} value={k}>{CREDIT_LABEL[k]}</option>)}
                </select>
                <button type="button" className="secondary" onClick={() => setSection(si, (x) => ({ ...x, items: move(x.items, ii, -1) }))} aria-label="Move item up">↑</button>
                <button type="button" className="secondary" onClick={() => setSection(si, (x) => ({ ...x, items: move(x.items, ii, 1) }))} aria-label="Move item down">↓</button>
                <button type="button" className="danger" onClick={() => confirm("Delete this item? Existing sign-offs for it will no longer count.") &&
                  setSection(si, (x) => ({ ...x, items: x.items.filter((_, i) => i !== ii) }))}>Delete</button>
              </div>
              <textarea rows={Math.max(2, it.details.length + 1)} value={it.details.join("\n")} aria-label="Details"
                placeholder="One bullet per line. Start a line with '> ' for plain text, '## ' for a sub-heading."
                onChange={(e) => setItem(si, ii, (x) => ({ ...x, details: e.target.value.split("\n") }))} style={{ marginTop: 6 }} />
            </div>
          ))}
          <button type="button" className="secondary" onClick={() => setSection(si, (x) => ({ ...x, items: [...x.items, newItem()] }))}>+ Add item</button>
        </div>
      ))}
      <button type="button" className="secondary"
        onClick={() => update((c) => ({ ...c, sections: [...c.sections, { key: "", title: "NEW SECTION", items: [newItem()] }] }))}>+ Add section</button>

      <div className="sticky row">
        <button disabled={!dirty}>Save as revision {revision + 1}</button>
        {dirty && <span className="muted">Unsaved changes</span>}
      </div>
    </form>
  );
}
