"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import {
  Check, ChevronDown, CircleCheck, Flag, ListFilter, Lock, Mail, MessageSquarePlus, MessageSquareText,
  PartyPopper, PenLine, Printer, TriangleAlert, Undo2, X,
} from "lucide-react";
import { completeTest, signItem, unsignItem } from "@/app/actions";
import { Details, detailCount } from "@/components/Details";
import { SubmitButton } from "@/components/SubmitButton";
import { Avatar, ProgressBar } from "@/components/ui";

export interface ItemVM {
  key: string; title: string; details: string[]; mark: string; creditLabel?: string;
  signed?: { examiner: string; date: string; credit?: string; note?: string; canRemove: boolean };
}
export interface SectionVM { key: string; title: string; note?: string; items: ItemVM[] }

type Props = {
  userId: number; testKey: string; candidate: string; candidateRank: string;
  testTitle: string; heading: string; revision: number; wind?: string; notes: string[];
  sections: SectionVM[]; done: number; total: number; canSign: boolean; canCredit: boolean;
  ineligible?: string; grants: string; completion?: { name: string; date: string; version: string }; version: string;
};

/** Wide screens show item details expanded by default; phones keep them collapsed. */
function useWide() {
  return useSyncExternalStore(
    (cb) => { const m = window.matchMedia("(min-width: 900px)"); m.addEventListener("change", cb); return () => m.removeEventListener("change", cb); },
    () => window.matchMedia("(min-width: 900px)").matches,
    () => false,
  );
}

function Hidden({ userId, testKey, itemKey }: { userId: number; testKey: string; itemKey?: string }) {
  return (
    <>
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="testKey" value={testKey} />
      {itemKey && <input type="hidden" name="itemKey" value={itemKey} />}
    </>
  );
}

function ItemRow({ it, n, p, wide }: { it: ItemVM; n: number; p: Props; wide: boolean }) {
  const [openPref, setOpen] = useState<boolean | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const s = it.signed;
  const open = openPref ?? (wide && !s);
  const detailsId = `d-${it.key}`;
  const titleId = `t-${it.key}`;
  const count = detailCount(it.details);

  return (
    <li className={`item${s ? " signed" : ""}`} aria-labelledby={titleId}>
      <span className="item__status" aria-hidden="true">{s ? <Check size={17} strokeWidth={3} /> : n}</span>
      <div className="item__body">
        <div className="item__title" id={titleId}>
          {it.title}{it.mark && <span className="item__mark" title={it.creditLabel}>{it.mark}</span>}
          {s && <span className="sr-only"> (signed)</span>}
        </div>
        {it.details.length > 0 && (
          <>
            <button type="button" className="disclose" aria-expanded={open} aria-controls={detailsId} onClick={() => setOpen(!open)}>
              {open ? "Hide details" : `Details${count ? ` (${count})` : ""}`}<ChevronDown size={16} aria-hidden="true" />
            </button>
            {open && <div className="details" id={detailsId}><Details lines={it.details} /></div>}
          </>
        )}
        {s && (
          <div className="signed-meta">
            <span className="signed-meta__who"><CircleCheck size={16} aria-hidden="true" />Signed by <b className="who">{s.examiner}</b></span>
            <span className="muted">{s.date}</span>
            {s.credit && <span className="chip chip--end">{s.credit}</span>}
            {s.canRemove && (
              <form action={unsignItem}>
                <Hidden userId={p.userId} testKey={p.testKey} itemKey={it.key} />
                <SubmitButton className="btn btn--ghost-muted btn--sm" pendingText="Removing…" icon={<Undo2 size={15} aria-hidden="true" />}>
                  Remove sign-off
                </SubmitButton>
              </form>
            )}
            {s.note && <span className="signed-meta__note"><MessageSquareText size={14} aria-hidden="true" />“{s.note}”</span>}
          </div>
        )}
      </div>
      {!s && p.canSign && (
        <div className="item__action">
          <form action={signItem} className="sig-form">
            <Hidden userId={p.userId} testKey={p.testKey} itemKey={it.key} />
            {p.canCredit && it.creditLabel && (
              <label className="credit-toggle">
                <input type="checkbox" name="credit" className="switch" />
                <span>{it.creditLabel}</span>
              </label>
            )}
            {noteOpen && (
              <div className="row" style={{ flexWrap: "nowrap" }}>
                <label className="sr-only" htmlFor={`note-${it.key}`}>Note for {it.title}</label>
                <input id={`note-${it.key}`} className="input" type="text" name="note" placeholder="Note (optional)" maxLength={500} autoFocus />
                <button type="button" className="btn btn--ghost-muted btn--icon" aria-label="Remove note" onClick={() => setNoteOpen(false)}>
                  <X size={18} aria-hidden="true" />
                </button>
              </div>
            )}
            <div className="sig-form__row">
              {!noteOpen && (
                <button type="button" className="btn btn--secondary" onClick={() => setNoteOpen(true)}>
                  <MessageSquarePlus size={18} aria-hidden="true" />Add note
                </button>
              )}
              <SubmitButton className="btn btn--primary btn--sign" pendingText="Signing…" icon={<PenLine size={18} aria-hidden="true" />}
                aria-label={`Sign off: ${it.title}`}>
                Sign off
              </SubmitButton>
            </div>
          </form>
        </div>
      )}
    </li>
  );
}

const CONFETTI = ["#34c46f", "#5ea8f7", "#f0c060", "#3cc7bb", "#f78fb3", "#0a5bab"];

export function SheetChecklist(p: Props & { fresh?: boolean }) {
  const wide = useWide();
  const [remaining, setRemaining] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const complete = p.total > 0 && p.done === p.total;
  const left = p.total - p.done;
  let n = 0;

  return (
    <>
      <div className="sheet-bar screen-only">
        <div className="sheet-bar__inner">
          <div className="sheet-bar__who">
            <Avatar name={p.candidate} size="sm" />
            <div style={{ minWidth: 0 }}>
              <div className="sheet-bar__name">{p.candidate}</div>
              <div className="sheet-bar__test">{p.testTitle} test · {p.candidateRank}</div>
            </div>
          </div>
          <div className="sheet-bar__actions">
            <button type="button" className="btn btn--secondary toggle-btn" aria-pressed={remaining}
              onClick={() => setRemaining(!remaining)} title="Show remaining items only">
              <ListFilter size={18} aria-hidden="true" /><span className="btn-label">Remaining only</span>
            </button>
            <button type="button" className="btn btn--secondary" onClick={() => window.print()} title="Print the paper sheet">
              <Printer size={18} aria-hidden="true" /><span className="btn-label">Print</span>
            </button>
          </div>
          <div className="sheet-bar__progress">
            <div className="progress">
              <ProgressBar done={p.done} total={p.total} label={false} />
              <span className="progress__label" aria-live="polite">
                {p.completion ? <strong>Completed</strong> : complete ? <strong>All signed</strong> : <><strong>{p.done}</strong> of {p.total} signed · {left} left</>}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="sheet screen-only">
        {p.completion && (
          <section className="celebrate" aria-label="Test complete">
            {p.fresh && (
              <div className="confetti" aria-hidden="true">
                {Array.from({ length: 18 }, (_, i) => (
                  <i key={i} style={{ left: `${(i * 37) % 100}%`, background: CONFETTI[i % CONFETTI.length], animationDelay: `${(i % 6) * 0.12}s` }} />
                ))}
              </div>
            )}
            <div className="celebrate__inner">
              <span className="celebrate__badge"><PartyPopper size={30} aria-hidden="true" /></span>
              <div style={{ flex: "1 1 240px", minWidth: 0 }}>
                <h2>Test complete</h2>
                <p>{p.candidate} passed the {p.testTitle} test and has been {p.grants}.</p>
                <p className="signed small">Final tester <span className="who">{p.completion.name}</span> · {p.completion.date} · sheet {p.completion.version}</p>
                <a className="celebrate__mail" href={`mailto:TestComplete@torontosailing.com?subject=${encodeURIComponent(`${p.testTitle} test complete: ${p.candidate}`)}`}>
                  <Mail size={16} aria-hidden="true" />Please notify TestComplete@torontosailing.com
                </a>
              </div>
            </div>
          </section>
        )}

        {p.ineligible && <div className="flash error" role="status"><TriangleAlert size={18} aria-hidden="true" /><span>{p.ineligible}</span></div>}

        <section className="card sheet-intro" aria-label="Sheet">
          <div className="sheet-intro__top">
            <div className="grow">
              <div className="sheet-title">{p.heading}{p.revision > 0 && <span className="muted small"> (rev {p.revision})</span>}</div>
              <div className="sheet-meta">
                <span className="chip">{p.total} items</span>
                <span className="chip">Sheet {p.version}</span>
                {!p.canSign && !p.completion && <span className="chip"><Lock size={12} aria-hidden="true" />View only</span>}
              </div>
            </div>
            {p.wind && <div className="wind" title="Minimum base wind"><b>{p.wind}</b><span>Min Base Wind</span></div>}
          </div>
          {p.notes.length > 0 && <ul className="sheet-notes">{p.notes.map((t, i) => <li key={i}>{t}</li>)}</ul>}
          <div className="sheet-cand">
            <div><div className="sheet-cand__label">Candidate Name</div><div className="sheet-cand__value">{p.candidate}</div></div>
            <div><div className="sheet-cand__label">Final tester &amp; date</div>
              <div className="sheet-cand__value">{p.completion ? `${p.completion.name} · ${p.completion.date}` : <span className="muted">Not yet completed</span>}</div></div>
          </div>
        </section>

        {remaining && complete && (
          <div className="empty"><CircleCheck size={32} aria-hidden="true" /><strong>Nothing left to sign</strong><span>Every item on this sheet is signed.</span></div>
        )}

        {p.sections.map((sec) => {
          const signedHere = sec.items.filter((i) => i.signed).length;
          const secDone = signedHere === sec.items.length;
          const start = n;
          n += sec.items.length;
          if (remaining && secDone) return null;
          return (
            <section key={sec.key} className="sec-card" data-complete={secDone} aria-labelledby={`s-${sec.key}`}>
              <header className="sec-card__head">
                <div className="grow">
                  <h2 className="sec-card__title" id={`s-${sec.key}`}>{sec.title}</h2>
                  {sec.note && <div className="sec-card__note">{sec.note}</div>}
                </div>
                <div className="sec-card__count">
                  <span className={`chip ${secDone ? "chip--ok" : ""}`}>{secDone && <Check size={12} aria-hidden="true" />}{signedHere}/{sec.items.length}</span>
                  <ProgressBar done={signedHere} total={sec.items.length} thin label={false} />
                </div>
              </header>
              <ol className="items">
                {sec.items.map((it, i) => (remaining && it.signed ? null : <ItemRow key={it.key} it={it} n={start + i + 1} p={p} wide={wide} />))}
              </ol>
            </section>
          );
        })}

        {!p.completion && (
          <section className="card final-card" id="final" data-ready={complete} aria-labelledby="final-h">
            <div className="card__head" style={{ marginBottom: "var(--s-3)" }}>
              <span className="card__icon"><Flag size={18} aria-hidden="true" /></span>
              <div>
                <h2 id="final-h">Final sign-off</h2>
                <div className="small muted">Signature of final tester &amp; date of completion</div>
              </div>
            </div>
            {p.canSign ? (
              <div className="row">
                <button type="button" className="btn btn--success btn--lg" disabled={!complete} onClick={() => dialog.current?.showModal()}>
                  <Flag size={20} aria-hidden="true" />Complete test
                </button>
                <span className="small muted">{complete ? "Every item is signed. You’ll sign as final tester." : `${left} item${left === 1 ? "" : "s"} still to sign`}</span>
              </div>
            ) : (
              <p className="small muted">{complete ? "All items are signed; waiting for a final tester." : `${left} item${left === 1 ? "" : "s"} still to sign before the test can be completed.`}</p>
            )}
            <p className="small muted" style={{ marginTop: "var(--s-3)" }}>(please notify TestComplete@torontosailing.com)</p>
          </section>
        )}

        {p.canSign && (
          <dialog ref={dialog} className="dialog" aria-labelledby="confirm-h">
            <div className="dialog__body">
              <span className="dialog__icon"><Flag size={24} aria-hidden="true" /></span>
              <h2 id="confirm-h">Complete the {p.testTitle} test?</h2>
              <p>You’ll sign as final tester for <b>{p.candidate}</b>, who will be {p.grants}.</p>
              <p className="small muted">This can’t be undone in the app. Afterwards, please notify TestComplete@torontosailing.com.</p>
            </div>
            <div className="dialog__actions">
              <button type="button" className="btn btn--secondary" onClick={() => dialog.current?.close()}>Cancel</button>
              <form action={completeTest}>
                <Hidden userId={p.userId} testKey={p.testKey} />
                <SubmitButton className="btn btn--success" pendingText="Completing…" icon={<Check size={18} aria-hidden="true" />}>
                  Confirm and sign
                </SubmitButton>
              </form>
            </div>
          </dialog>
        )}
      </div>
    </>
  );
}
