import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronRight, ShieldCheck, X } from "lucide-react";
import { loadUser, requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { fmtDate } from "@/lib/data";
import { EXCEPTION_TESTS, canGrantExceptions, canViewMember, isEligible } from "@/lib/permissions";
import { DEFAULT_BY_KEY, RANKS } from "@/lib/tests";
import { grantException, revokeException } from "@/app/actions";
import { Flash } from "@/components/Flash";
import { MemberOverview } from "@/components/MemberOverview";
import { SubmitButton } from "@/components/SubmitButton";

export default async function MemberPage({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>>;
}) {
  const user = await requireUser();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  if (!canViewMember(user, id)) redirect("/");
  const member = await loadUser(id);
  if (!member) notFound();
  const self = member.id === user.id;

  const exceptions = await query<{ test_key: string; reason: string | null; created_at: Date; by: string }>(
    `SELECT x.test_key, x.reason, x.created_at, u.name AS by FROM test_exceptions x JOIN users u ON u.id=x.granted_by
      WHERE x.user_id=$1 ORDER BY x.created_at`, [id]);
  const canGrant = canGrantExceptions(user) && user.id !== id && !user.viewedBy;
  // Exception tests that would be a promotion and aren't already open to the member.
  const grantable = EXCEPTION_TESTS.map((k) => DEFAULT_BY_KEY[k]).filter((t) =>
    RANKS.indexOf(member.rank) < RANKS.indexOf(t.grants.rank!) && !isEligible(t, member));

  return (
    <>
      <nav className="crumbs" aria-label="Breadcrumb">
        {self ? <Link href="/">My progress</Link> : <Link href="/members">Members</Link>}
        <ChevronRight size={14} aria-hidden="true" />
        <span aria-current="page">{member.name}</span>
      </nav>
      <Flash sp={await searchParams} />
      <MemberOverview member={member} eyebrow={self ? "My progress" : "Member"} self={self} />

      {(exceptions.length > 0 || (canGrant && grantable.length > 0)) && (
        <section className="card exceptions" aria-labelledby="exc-h" style={{ marginTop: "var(--s-6)" }}>
          <div className="card__head">
            <span className="card__icon" style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}><ShieldCheck size={18} aria-hidden="true" /></span>
            <div>
              <h2 id="exc-h">Testing committee exceptions</h2>
              <div className="small muted">Open a higher test for a member below the usual rating, e.g. an experienced sailor joining as a Novice.</div>
            </div>
          </div>
          {exceptions.length > 0 && (
            <ul className="list exceptions__list">
              {exceptions.map((x) => (
                <li key={x.test_key}>
                  <div className="list__main">
                    <div className="list__title">{DEFAULT_BY_KEY[x.test_key]?.title ?? x.test_key}</div>
                    <div className="list__meta">Opened by {x.by}, {fmtDate(x.created_at)}{x.reason && <>: <i>“{x.reason}”</i></>}</div>
                  </div>
                  {canGrant && (
                    <form action={revokeException}>
                      <input type="hidden" name="userId" value={id} /><input type="hidden" name="testKey" value={x.test_key} />
                      <SubmitButton className="btn btn--ghost-muted btn--sm" pendingText="Removing…" icon={<X size={15} aria-hidden="true" />}>Remove</SubmitButton>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          )}
          {canGrant && grantable.length > 0 && (
            <form action={grantException} className="exceptions__form">
              <input type="hidden" name="userId" value={id} />
              <label className="field"><span className="field__label">Test to open</span>
                <select className="select" name="testKey">
                  {grantable.map((t) => <option key={t.key} value={t.key}>{t.title}</option>)}
                </select></label>
              <label className="field"><span className="field__label">Reason (optional)</span>
                <input className="input" name="reason" placeholder="e.g. Experienced dinghy sailor" maxLength={300} /></label>
              <SubmitButton className="btn btn--secondary" pendingText="Opening…" icon={<ShieldCheck size={17} aria-hidden="true" />}>Allow test by exception</SubmitButton>
            </form>
          )}
        </section>
      )}
    </>
  );
}
