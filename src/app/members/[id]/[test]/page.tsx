import { notFound, redirect } from "next/navigation";
import { loadUser, requireUser } from "@/lib/auth";
import { one, query } from "@/lib/db";
import { fmtDate, getSignoffs } from "@/lib/data";
import { canAdminister, canViewMember, isEligible, isExaminer } from "@/lib/permissions";
import { computeProgress } from "@/lib/progress";
import { getSheet, versionLabel } from "@/lib/sheets";
import { CREDIT_LABEL, CREDIT_MARK, ENDORSEMENT_LABEL, RANK_LABEL, circled, sheetHeading, type CreditKind } from "@/lib/tests";
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
  // What passing this test does to the member, in words.
  const grantText = test.grants.rank ? `promote to ${RANK_LABEL[test.grants.rank]}` : `grant ${ENDORSEMENT_LABEL[test.grants.endorsement!]} rights`;
  const resultText = test.grants.rank ? `is now ${RANK_LABEL[test.grants.rank]}` : `now holds ${ENDORSEMENT_LABEL[test.grants.endorsement!]} rights`;
  const canTrack = isExaminer(user) && user.id !== id && !user.viewedBy;
  // Everyone testing this candidate on this test: examiners who marked "I'm testing" plus anyone who signed an item.
  const testers = await query<{ id: number; name: string; signed: number; tracking: boolean }>(
    `SELECT u.id, u.name,
            (SELECT count(*)::int FROM signoffs s WHERE s.user_id=$1 AND s.test_key=$2 AND s.examiner_id=u.id) AS signed,
            EXISTS (SELECT 1 FROM tracked_tests t WHERE t.user_id=$1 AND t.test_key=$2 AND t.examiner_id=u.id) AS tracking
       FROM users u
      WHERE u.id IN (SELECT examiner_id FROM tracked_tests WHERE user_id=$1 AND test_key=$2
                     UNION SELECT examiner_id FROM signoffs WHERE user_id=$1 AND test_key=$2)
      ORDER BY signed DESC, u.name`, [id, testKey]);
  const tracking = canTrack && testers.some((t) => t.id === user.id && t.tracking);
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
        {completion && (
          <p className="flash ok passed">
            ✓ {member.name} passed {test.title} and {resultText}. Final tester {completion.name}, {fmtDate(completion.completed_at)}.
          </p>
        )}
        {!completion && !eligible && (
          <p className="flash error">{member.name} is not currently eligible for this test (rating: {RANK_LABEL[member.rank]}).</p>
        )}
        {!completion && <ProgressBar done={progress.done} total={progress.total} />}
        <div className="testers">
          <strong>Testing this candidate:</strong>{" "}
          {testers.length === 0 ? <span className="muted">nobody yet</span> : testers.map((t, i) => (
            <span key={t.id} className="tester">
              {t.name}
              <span className="muted small">
                {" "}({[t.tracking && "testing", t.signed > 0 && `${t.signed} signed`].filter(Boolean).join(", ")})
              </span>
              {i < testers.length - 1 && ", "}
            </span>
          ))}
        </div>
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
                    <button disabled={!progress.complete}>Complete test &amp; {grantText}</button>
                    <span className="small muted">Signs you as final tester{progress.complete ? ` and updates ${member.name}’s status.` : "."}</span>
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
