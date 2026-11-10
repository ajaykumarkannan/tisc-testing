import { notFound, redirect } from "next/navigation";
import { loadUser, requireUser } from "@/lib/auth";
import { one } from "@/lib/db";
import { fmtDate, getSignoffs } from "@/lib/data";
import { canAdminister, canViewMember, isEligible, isExaminer } from "@/lib/permissions";
import { computeProgress } from "@/lib/progress";
import { getSheet, versionLabel } from "@/lib/sheets";
import { CREDIT_LABEL, CREDIT_MARK, RANK_LABEL, circled, sheetHeading, type CreditKind } from "@/lib/tests";
import { completeTest, signItem, trackTest, unsignItem, untrackTest } from "@/app/actions";
import { Details } from "@/components/Details";
import { Flash } from "@/components/Flash";
import { ProgressBar } from "@/components/Progress";

export default async function SheetPage({ params, searchParams }: {
  params: Promise<{ id: string; test: string }>; searchParams: Promise<Record<string, string>>;
}) {
  const user = await requireUser();
  const { id: idStr, test: testKey } = await params;
  const sp = await searchParams;
  const id = Number(idStr);
  if (!Number.isInteger(id)) notFound();
  if (!canViewMember(user, id)) redirect("/");
  const [member, test] = await Promise.all([loadUser(id), getSheet(testKey)]);
  if (!member || !test) notFound();

  const [signoffs, completion] = await Promise.all([
    getSignoffs(id, testKey),
    one<{ completed_at: Date; name: string; sheet_version: string }>(
      `SELECT c.completed_at, u.name, c.sheet_version FROM completions c JOIN users u ON u.id=c.final_examiner_id
        WHERE c.user_id=$1 AND c.test_key=$2`, [id, testKey]),
  ]);
  const byItem = new Map(signoffs.map((s) => [s.item_key, s]));
  const canTrack = isExaminer(user) && user.id !== id && !user.viewedBy;
  const tracking = canTrack && !!(await one("SELECT 1 FROM tracked_tests WHERE examiner_id=$1 AND user_id=$2 AND test_key=$3", [user.id, id, testKey]));
  const progress = computeProgress(test, byItem.keys());
  const eligible = isEligible(test, member);
  const canSign = !completion && eligible && canAdminister(user, testKey) && user.id !== id;
  const canCredit = canSign && user.role !== "member";
  const hidden = (itemKey?: string) => (
    <>
      <input type="hidden" name="userId" value={id} />
      <input type="hidden" name="testKey" value={testKey} />
      {itemKey && <input type="hidden" name="itemKey" value={itemKey} />}
    </>
  );

  return (
    <>
      <div className="no-print">
        <Flash sp={sp} />
        {!completion && !eligible && (
          <p className="flash error">{member.name} is not currently eligible for this test (rating: {RANK_LABEL[member.rank]}).</p>
        )}
        {!completion && <ProgressBar done={progress.done} total={progress.total} />}
        {canTrack && (
          <form action={tracking ? untrackTest : trackTest} className="track-form">
            {hidden()}
            {tracking
              ? <><span className="badge">You’re testing this candidate</span> <button className="link small">Stop tracking</button></>
              : <button className="secondary">I’m testing this candidate</button>}
          </form>
        )}
      </div>

      <div className="sheet">
        <table>
          <tbody>
            <tr>
              <td className="sheet-title">{sheetHeading(test)}{test.revision > 0 && <span className="muted small"> (rev {test.revision})</span>}</td>
              {test.minBaseWind !== undefined && <td className="wind"><b>{circled(test.minBaseWind)}</b>Min Base Wind</td>}
            </tr>
            {test.notes.length > 0 && (
              <tr><td colSpan={2} className="notes">{test.notes.map((n, i) => <p key={i}>{n}</p>)}</td></tr>
            )}
          </tbody>
        </table>
        <table className="cand">
          <tbody>
            <tr>
              <td style={{ width: "50%" }}>Candidate Name:<div style={{ fontWeight: 700, fontSize: "1.1rem" }}>{member.name}</div></td>
              <td>
                Signature of final tester &amp; date of completion:
                {completion ? (
                  <div className="signed"><span className="who">{completion.name}</span> · {fmtDate(completion.completed_at)}
                    <div className="small muted">Sheet {completion.sheet_version}</div></div>
                ) : canSign ? (
                  <form action={completeTest} className="sig-form" style={{ marginTop: 6 }}>
                    {hidden()}
                    <button disabled={!progress.complete}>Complete test &amp; sign as final tester</button>
                    {!progress.complete && <span className="small muted">{progress.total - progress.done} item(s) still to sign</span>}
                  </form>
                ) : null}
                <div className="small">(please notify TestComplete@torontosailing.com)</div>
              </td>
            </tr>
          </tbody>
        </table>

        {test.sections.map((sec) => (
          <table key={sec.key} className="sec">
            <thead>
              <tr>
                <th>{sec.title}{sec.note && <span className="note">{sec.note}</span>}</th>
                <th className="sig-col">Examiner signature &amp; date</th>
              </tr>
            </thead>
            <tbody>
              {sec.items.map((it) => {
                const s = byItem.get(it.key);
                const mark = it.credit && !sec.title.includes(CREDIT_MARK[it.credit]) ? ` ${CREDIT_MARK[it.credit]}` : "";
                return (
                  <tr key={it.key}>
                    <td><div className="item-title">{it.title}{mark}</div><Details lines={it.details} /></td>
                    <td className="sig-col">
                      {s ? (
                        <div className="signed">
                          <span className="who">{s.examiner_name}</span> · {fmtDate(s.signed_at)}
                          {s.credit && <div className="small">{CREDIT_LABEL[s.credit as CreditKind] ?? s.credit}</div>}
                          {s.note && <div className="small muted">“{s.note}”</div>}
                          {canSign && (s.examiner_id === user.id || user.role !== "member") && (
                            <form action={unsignItem} className="no-print" style={{ marginTop: 4 }}>
                              {hidden(it.key)}<button className="link small">Remove sign-off</button>
                            </form>
                          )}
                        </div>
                      ) : canSign ? (
                        <form action={signItem} className="sig-form">
                          {hidden(it.key)}
                          <input type="text" name="note" placeholder="Note (optional)" maxLength={500} />
                          {canCredit && it.credit && (
                            <label className="small check" style={{ margin: 0 }}><input type="checkbox" name="credit" /> {CREDIT_LABEL[it.credit]}</label>
                          )}
                          <button>Sign off</button>
                        </form>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ))}
      </div>
      <p className="muted small no-print">Sheet version {versionLabel(test)}. Sign-offs record the examiner and date.</p>
    </>
  );
}
