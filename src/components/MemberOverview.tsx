import Link from "next/link";
import { ArrowRight, CircleCheck, History, MessageSquareText, Sailboat, Trophy } from "lucide-react";
import type { User } from "@/lib/auth";
import { fmtDate, getCompletions, recentSignoffs, signedByTest } from "@/lib/data";
import { isEligible } from "@/lib/permissions";
import { computeProgress } from "@/lib/progress";
import { sheetList } from "@/lib/sheets";
import { CREDIT_LABEL, ENDORSEMENTS, ENDORSEMENT_LABEL, RANKS, RANK_LABEL, allItems, type CreditKind } from "@/lib/tests";
import { Avatar, EndorsementChip, ProgressRing, RankChip } from "./ui";

/** Rank ladder, endorsements, tests in progress / available, and history for one member. */
export async function MemberOverview({ member, eyebrow, self }: { member: User; eyebrow: string; self: boolean }) {
  const [sheets, signed, completions, recent] = await Promise.all([
    sheetList(), signedByTest(member.id), getCompletions(member.id), recentSignoffs(member.id),
  ]);
  const doneKeys = new Set(completions.map((c) => c.test_key));
  const available = sheets.filter((t) => isEligible(t, member) && !doneKeys.has(t.key));
  const titleOf = Object.fromEntries(sheets.map((t) => [t.key, t.title]));
  const itemTitle = (testKey: string, itemKey: string) => {
    const t = sheets.find((s) => s.key === testKey);
    return (t && allItems(t).find((i) => i.key === itemKey)?.title) ?? itemKey.replace(/_/g, " ").toUpperCase();
  };

  const rankIdx = RANKS.indexOf(member.rank);
  const nextRankTest = available.find((t) => t.grants.rank === RANKS[rankIdx + 1]);
  const nextProgress = nextRankTest ? computeProgress(nextRankTest, signed[nextRankTest.key] ?? []) : null;
  const completedRank = (i: number) => completions.find((c) => sheets.find((s) => s.key === c.test_key)?.grants.rank === RANKS[i]);

  return (
    <>
      <section className="hero" aria-label="Rating">
        <div className="hero__top">
          <Avatar name={member.name} size="xl" />
          <div className="grow">
            <div className="page-head__eyebrow" style={{ color: "#9ccbfb" }}>{eyebrow}</div>
            <h1>{member.name}</h1>
            <div className="hero__sub">{member.email}</div>
          </div>
          <RankChip rank={member.rank} large />
        </div>

        <ol className="ladder" aria-label="Rating ladder">
          {RANKS.map((r, i) => {
            const state = i < rankIdx ? "done" : i === rankIdx ? "current" : i === rankIdx + 1 ? "next" : "future";
            const passed = completedRank(i);
            const note = state === "current" ? "Current"
              : state === "done" ? (passed ? fmtDate(passed.completed_at) : "Passed")
              : state === "next" && nextProgress ? `${nextProgress.done}/${nextProgress.total} signed`
              : state === "next" ? "Next" : "";
            return (
              <li key={r} data-state={state} aria-current={state === "current" ? "step" : undefined}>
                <span className="ladder__dot">{state === "done" ? <CircleCheck size={18} aria-hidden="true" /> : i + 1}</span>
                <span className="ladder__label">{RANK_LABEL[r]}</span>
                {note && <span className="ladder__note">{note}</span>}
              </li>
            );
          })}
        </ol>

        <div className="hero__ends">
          <span className="label">Endorsements</span>
          {member.rank === "novice" && member.endorsements.length === 0
            ? <span className="chip chip--outline chip--lg">None yet · open once you’re Helms</span>
            : ENDORSEMENTS.map((e) => member.endorsements.includes(e)
              ? <EndorsementChip key={e} e={e} large />
              : <span key={e} className="chip chip--outline chip--lg">{ENDORSEMENT_LABEL[e]} · not yet</span>)}
        </div>
      </section>

      <h2 className="section-title">Working towards {available.length > 0 && <span className="count">{available.length}</span>}</h2>
      {available.length === 0 ? (
        <div className="empty">
          <Sailboat size={32} aria-hidden="true" />
          <strong>{member.rank === "skipper" ? "Top of the ladder" : "Nothing to work on right now"}</strong>
          <span>No further tests available at this rating.</span>
        </div>
      ) : (
        <div className="grid">
          {available.map((t) => {
            const p = computeProgress(t, signed[t.key] ?? []);
            const left = p.total - p.done;
            const status = p.complete ? <span className="chip chip--ok">Ready to complete</span>
              : p.done > 0 ? <span className="chip chip--rank">In progress</span>
              : <span className="chip">Not started</span>;
            return (
              <Link key={t.key} href={`/members/${member.id}/${t.key}`} className="test-card">
                <div className="test-card__top">
                  <ProgressRing done={p.done} total={p.total} />
                  <div style={{ minWidth: 0 }}>
                    <div className="test-card__title">{t.title}</div>
                    <div className="test-card__grants">
                      {t.grants.rank ? `Promotes to ${RANK_LABEL[t.grants.rank]}` : `Adds ${ENDORSEMENT_LABEL[t.grants.endorsement!]} rights`}
                    </div>
                  </div>
                </div>
                <div className="row">
                  {status}
                  <span className="small muted">{p.complete ? "All items signed" : `${left} of ${p.total} item${p.total === 1 ? "" : "s"} left`}</span>
                </div>
                <div className="test-card__foot">
                  <span className="muted">{p.done}/{p.total} signed</span>
                  <span className="test-card__cta">{self ? "View sheet" : "Open sheet"}<ArrowRight size={16} aria-hidden="true" /></span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <div className="grid" style={{ marginTop: "var(--s-8)", alignItems: "start" }}>
        <section className="card card--flush" aria-labelledby="completed-h">
          <div className="card__head" style={{ padding: "var(--s-4) var(--s-4) 0", marginBottom: "var(--s-2)" }}>
            <span className="card__icon" style={{ background: "var(--gold-soft)", color: "var(--gold)" }}><Trophy size={18} aria-hidden="true" /></span>
            <h2 id="completed-h">Completed tests</h2>
          </div>
          {completions.length === 0 ? <p className="muted small" style={{ padding: "0 var(--s-4) var(--s-4)" }}>None yet. Completed tests will appear here.</p> : (
            <ul className="list">{completions.map((c) => (
              <li key={c.test_key}>
                <span className="list__icon list__icon--gold"><Trophy size={16} aria-hidden="true" /></span>
                <div className="list__main">
                  <Link className="list__title" href={`/members/${member.id}/${c.test_key}`}>{titleOf[c.test_key] ?? c.test_key}</Link>
                  <div className="list__meta">{fmtDate(c.completed_at)} · final tester {c.final_examiner_name} · sheet {c.sheet_version}</div>
                </div>
              </li>))}
            </ul>
          )}
        </section>

        <section className="card card--flush" aria-labelledby="recent-h">
          <div className="card__head" style={{ padding: "var(--s-4) var(--s-4) 0", marginBottom: "var(--s-2)" }}>
            <span className="card__icon"><History size={18} aria-hidden="true" /></span>
            <h2 id="recent-h">Recent sign-offs</h2>
          </div>
          {recent.length === 0 ? <p className="muted small" style={{ padding: "0 var(--s-4) var(--s-4)" }}>No items signed yet.</p> : (
            <ul className="list">{recent.map((r) => (
              <li key={`${r.test_key}/${r.item_key}`} style={{ alignItems: "flex-start" }}>
                <span className="list__icon list__icon--ok"><CircleCheck size={16} aria-hidden="true" /></span>
                <div className="list__main">
                  <div className="list__title small">{itemTitle(r.test_key, r.item_key)}</div>
                  <div className="list__meta">{titleOf[r.test_key] ?? r.test_key} · {r.examiner_name} · {fmtDate(r.signed_at)}</div>
                  {r.credit && <div className="list__meta"><span className="chip chip--end" style={{ marginTop: 4 }}>{CREDIT_LABEL[r.credit as CreditKind] ?? r.credit}</span></div>}
                  {r.note && <div className="list__meta" style={{ fontStyle: "italic" }}><MessageSquareText size={13} aria-hidden="true" style={{ display: "inline", verticalAlign: "-2px" }} /> “{r.note}”</div>}
                </div>
              </li>))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
