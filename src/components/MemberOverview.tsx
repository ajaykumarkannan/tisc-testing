import Link from "next/link";
import type { User } from "@/lib/auth";
import { getCompletions, signedByTest, fmtDate } from "@/lib/data";
import { isEligible } from "@/lib/permissions";
import { computeProgress } from "@/lib/progress";
import { sheetList } from "@/lib/sheets";
import { ENDORSEMENT_LABEL, RANK_LABEL } from "@/lib/tests";
import { ProgressBar } from "./Progress";

/** Rank, endorsements, tests in progress / available, and history for one member. */
export async function MemberOverview({ member }: { member: User }) {
  const [sheets, signed, completions] = await Promise.all([sheetList(), signedByTest(member.id), getCompletions(member.id)]);
  const doneKeys = new Set(completions.map((c) => c.test_key));
  const available = sheets.filter((t) => isEligible(t, member) && !doneKeys.has(t.key));
  const titleOf = Object.fromEntries(sheets.map((t) => [t.key, t.title]));
  return (
    <>
      <div className="card">
        <div className="row">
          <span className="badge ok">{RANK_LABEL[member.rank]}</span>
          {member.endorsements.map((e) => <span key={e} className="badge ok">{ENDORSEMENT_LABEL[e]}</span>)}
        </div>
      </div>

      <h2>Working towards</h2>
      {available.length === 0 ? <p className="muted">No further tests available at this rating.</p> : (
        <div className="grid">
          {available.map((t) => {
            const p = computeProgress(t, signed[t.key] ?? []);
            return (
              <Link key={t.key} href={`/members/${member.id}/${t.key}`} className="card" style={{ textDecoration: "none", color: "inherit" }}>
                <strong>{t.title}</strong>
                <div className="muted small">
                  {t.grants.rank ? `→ ${RANK_LABEL[t.grants.rank]}` : `+ ${ENDORSEMENT_LABEL[t.grants.endorsement!]} rights`}
                </div>
                <ProgressBar done={p.done} total={p.total} />
              </Link>
            );
          })}
        </div>
      )}

      <h2>Completed tests</h2>
      {completions.length === 0 ? <p className="muted">None yet.</p> : (
        <div className="scroll"><table className="list">
          <thead><tr><th>Test</th><th>Completed</th><th>Final tester</th><th>Sheet</th></tr></thead>
          <tbody>{completions.map((c) => (
            <tr key={c.test_key}>
              <td><Link href={`/members/${member.id}/${c.test_key}`}>{titleOf[c.test_key] ?? c.test_key}</Link></td>
              <td>{fmtDate(c.completed_at)}</td><td>{c.final_examiner_name}</td><td className="muted">{c.sheet_version}</td>
            </tr>))}
          </tbody>
        </table></div>
      )}
    </>
  );
}
