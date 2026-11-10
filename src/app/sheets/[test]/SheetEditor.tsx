"use client";

import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, FileText, Plus, Save, Trash2, Undo2 } from "lucide-react";
import { CREDIT_KINDS, CREDIT_LABEL, CREDIT_MARK, type Item, type Section, type SheetContent } from "@/lib/tests";
import { Details } from "@/components/Details";
import { SubmitButton } from "@/components/SubmitButton";

type Props = { testKey: string; revision: number; initial: SheetContent; action: (f: FormData) => Promise<void> };

const move = <T,>(arr: T[], i: number, d: number) => {
  const j = i + d;
  if (j < 0 || j >= arr.length) return arr;
  const c = [...arr];
  [c[i], c[j]] = [c[j], c[i]];
  return c;
};
const newItem = (): Item => ({ key: "", title: "NEW ITEM", details: [] });

function Tools({ what, idx, len, onMove, onDelete }: {
  what: string; idx: number; len: number; onMove: (d: number) => void; onDelete: () => void;
}) {
  return (
    <div className="ed-tools">
      <button type="button" className="btn btn--secondary btn--icon btn--sm" onClick={() => onMove(-1)} disabled={idx === 0}
        aria-label={`Move ${what} up`} title={`Move ${what} up`}><ArrowUp size={17} aria-hidden="true" /></button>
      <button type="button" className="btn btn--secondary btn--icon btn--sm" onClick={() => onMove(1)} disabled={idx === len - 1}
        aria-label={`Move ${what} down`} title={`Move ${what} down`}><ArrowDown size={17} aria-hidden="true" /></button>
      <button type="button" className="btn btn--danger btn--icon btn--sm" onClick={onDelete}
        aria-label={`Delete ${what}`} title={`Delete ${what}`}><Trash2 size={17} aria-hidden="true" /></button>
    </div>
  );
}

function ItemEditor({ it, n, sectionTitle, onChange, tools }: {
  it: Item; n: string; sectionTitle: string; onChange: (fn: (x: Item) => Item) => void; tools: React.ReactNode;
}) {
  const [preview, setPreview] = useState(false);
  const mark = it.credit && !sectionTitle.includes(CREDIT_MARK[it.credit]) ? ` ${CREDIT_MARK[it.credit]}` : "";
  return (
    <div className="ed-item">
      <div className="ed-item__head">
        <span className="ed-num" aria-hidden="true">{n}</span>
        <input className="input input--title" value={it.title} aria-label="Item title" onChange={(e) => onChange((x) => ({ ...x, title: e.target.value }))} />
        {tools}
      </div>
      <textarea className="textarea" rows={Math.max(2, it.details.length + 1)} value={it.details.join("\n")} aria-label="Details"
        placeholder="One bullet per line. Start a line with '> ' for plain text, '## ' for a sub-heading."
        onChange={(e) => onChange((x) => ({ ...x, details: e.target.value.split("\n") }))} />
      <div className="ed-item__row">
        <select className="select" value={it.credit ?? ""} aria-label="Automatic credit"
          onChange={(e) => onChange((x) => ({ ...x, credit: (e.target.value || undefined) as Item["credit"] }))}>
          <option value="">No automatic credit</option>
          {CREDIT_KINDS.map((k) => <option key={k} value={k}>{CREDIT_MARK[k]} {CREDIT_LABEL[k]}</option>)}
        </select>
        <button type="button" className="btn btn--ghost btn--sm" aria-pressed={preview} onClick={() => setPreview(!preview)}>
          {preview ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}{preview ? "Hide preview" : "Preview"}
        </button>
      </div>
      {preview && (
        <div className="ed-preview" aria-label="Preview">
          <div className="ed-preview__label">How it appears on the sheet</div>
          <div className="item__title">{it.title}{mark && <span className="item__mark">{mark}</span>}</div>
          <div className="details"><Details lines={it.details.filter((l) => l.trim() !== "")} /></div>
        </div>
      )}
    </div>
  );
}

export function SheetEditor({ testKey, revision, initial, action }: Props) {
  const [s, setS] = useState<SheetContent>(initial);
  const [dirty, setDirty] = useState(false);
  const update = (fn: (c: SheetContent) => SheetContent) => { setS(fn); setDirty(true); };
  const setSection = (si: number, fn: (x: Section) => Section) =>
    update((c) => ({ ...c, sections: c.sections.map((x, i) => (i === si ? fn(x) : x)) }));
  const setItem = (si: number, ii: number, fn: (x: Item) => Item) =>
    setSection(si, (sec) => ({ ...sec, items: sec.items.map((x, i) => (i === ii ? fn(x) : x)) }));

  // Warn before leaving with unsaved edits.
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  return (
    <form action={action} className="editor">
      <input type="hidden" name="testKey" value={testKey} />
      <input type="hidden" name="revision" value={revision} />
      <input type="hidden" name="content" value={JSON.stringify(s)} />

      <section className="card" aria-labelledby="ed-details-h">
        <div className="card__head">
          <span className="card__icon"><FileText size={18} aria-hidden="true" /></span>
          <h2 id="ed-details-h">Sheet details</h2>
        </div>
        <div className="grid-2">
          <label className="field"><span className="field__label">Sheet title</span>
            <input className="input" value={s.title} onChange={(e) => update((c) => ({ ...c, title: e.target.value }))} /></label>
          <label className="field"><span className="field__label">Min base wind</span>
            <input className="input" type="number" inputMode="numeric" min={0} max={20} value={s.minBaseWind ?? ""}
              onChange={(e) => update((c) => ({ ...c, minBaseWind: e.target.value === "" ? undefined : Number(e.target.value) }))} /></label>
        </div>
        <label className="field" style={{ marginBottom: 0 }}><span className="field__label">Notes at the top of the sheet</span>
          <textarea className="textarea" rows={4} value={s.notes.join("\n")} onChange={(e) => update((c) => ({ ...c, notes: e.target.value.split("\n") }))} />
          <span className="field__hint">One note per line.</span></label>
      </section>

      <div className="ed-hint" aria-label="Detail line conventions">
        <span>Item details: one bullet per line</span>
        <span><code>&gt; text</code> plain line</span>
        <span><code>## TEXT</code> sub-heading in the same signature box</span>
      </div>

      {s.sections.map((sec, si) => (
        <section key={si} className="ed-section" aria-label={`Section ${si + 1}`}>
          <div className="ed-section__head">
            <span className="ed-num">Section {si + 1}</span>
            <input className="input input--title" value={sec.title} aria-label="Section title"
              onChange={(e) => setSection(si, (x) => ({ ...x, title: e.target.value }))} />
            <Tools what="section" idx={si} len={s.sections.length}
              onMove={(d) => update((c) => ({ ...c, sections: move(c.sections, si, d) }))}
              onDelete={() => confirm("Delete this section and its items?") && update((c) => ({ ...c, sections: c.sections.filter((_, i) => i !== si) }))} />
          </div>
          <div className="ed-section__body">
            <label className="field" style={{ marginBottom: 0 }}><span className="field__label">Section note (optional)</span>
              <input className="input" value={sec.note ?? ""} onChange={(e) => setSection(si, (x) => ({ ...x, note: e.target.value }))} /></label>
            {sec.items.map((it, ii) => (
              <ItemEditor key={it.key || `new-${ii}`} it={it} n={`${si + 1}.${ii + 1}`} sectionTitle={sec.title}
                onChange={(fn) => setItem(si, ii, fn)}
                tools={<Tools what="item" idx={ii} len={sec.items.length}
                  onMove={(d) => setSection(si, (x) => ({ ...x, items: move(x.items, ii, d) }))}
                  onDelete={() => confirm("Delete this item? Existing sign-offs for it will no longer count.") &&
                    setSection(si, (x) => ({ ...x, items: x.items.filter((_, i) => i !== ii) }))} />} />
            ))}
            <button type="button" className="btn btn--dashed btn--block" onClick={() => setSection(si, (x) => ({ ...x, items: [...x.items, newItem()] }))}>
              <Plus size={18} aria-hidden="true" />Add item
            </button>
          </div>
        </section>
      ))}
      <button type="button" className="btn btn--dashed btn--block btn--lg"
        onClick={() => update((c) => ({ ...c, sections: [...c.sections, { key: "", title: "NEW SECTION", items: [newItem()] }] }))}>
        <Plus size={20} aria-hidden="true" />Add section
      </button>

      <div className="save-bar" data-dirty={dirty}>
        <span className="save-bar__status" aria-live="polite"><span className="dot" aria-hidden="true" />{dirty ? "Unsaved changes" : "No changes yet"}</span>
        {dirty && (
          <button type="button" className="btn btn--ghost-muted" onClick={() => { setS(initial); setDirty(false); }}>
            <Undo2 size={17} aria-hidden="true" />Discard
          </button>
        )}
        <SubmitButton disabled={!dirty} pendingText="Saving…" icon={<Save size={18} aria-hidden="true" />}>Save as revision {revision + 1}</SubmitButton>
      </div>
    </form>
  );
}
