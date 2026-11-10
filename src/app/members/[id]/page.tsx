import { notFound, redirect } from "next/navigation";
import { loadUser, requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { fmtDate } from "@/lib/data";
import { EXCEPTION_TESTS, canGrantExceptions, canViewMember, isEligible } from "@/lib/permissions";
import { DEFAULT_BY_KEY, RANKS } from "@/lib/tests";
import { grantException, revokeException } from "@/app/actions";
import { Flash } from "@/components/Flash";
import { MemberOverview } from "@/components/MemberOverview";

export default async function MemberPage({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>>;
}) {
  const user = await requireUser();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  if (!canViewMember(user, id)) redirect("/");
  const member = await loadUser(id);
  if (!member) notFound();

  const exceptions = await query<{ test_key: string; reason: string | null; created_at: Date; by: string }>(
    `SELECT x.test_key, x.reason, x.created_at, u.name AS by FROM test_exceptions x JOIN users u ON u.id=x.granted_by
      WHERE x.user_id=$1 ORDER BY x.created_at`, [id]);
  const canGrant = canGrantExceptions(user) && user.id !== id && !user.viewedBy;
  // Exception tests that would be a promotion and aren't already open to the member.
  const grantable = EXCEPTION_TESTS.map((k) => DEFAULT_BY_KEY[k]).filter((t) =>
    RANKS.indexOf(member.rank) < RANKS.indexOf(t.grants.rank!) && !isEligible(t, member));

  return (
    <>
      <h1>{member.name}</h1>
      <Flash sp={await searchParams} />
      <MemberOverview member={member} />

      {(exceptions.length > 0 || (canGrant && grantable.length > 0)) && (
        <section className="card exceptions">
          <h2 style={{ marginTop: 0 }}>Testing committee exceptions</h2>
          {exceptions.map((x) => (
            <div key={x.test_key} className="row" style={{ justifyContent: "space-between" }}>
              <span>
                <strong>{DEFAULT_BY_KEY[x.test_key]?.title ?? x.test_key}</strong> opened by {x.by}, {fmtDate(x.created_at)}
                {x.reason && <span className="muted">: “{x.reason}”</span>}
              </span>
              {canGrant && (
                <form action={revokeException}>
                  <input type="hidden" name="userId" value={id} /><input type="hidden" name="testKey" value={x.test_key} />
                  <button className="link small">Remove</button>
                </form>
              )}
            </div>
          ))}
          {canGrant && grantable.length > 0 && (
            <form action={grantException} className="row" style={{ marginTop: 8 }}>
              <input type="hidden" name="userId" value={id} />
              <select name="testKey" aria-label="Test to open">
                {grantable.map((t) => <option key={t.key} value={t.key}>{t.title}</option>)}
              </select>
              <input name="reason" placeholder="Reason (optional)" maxLength={300} className="grow" />
              <button className="secondary">Allow test by exception</button>
            </form>
          )}
        </section>
      )}
    </>
  );
}
