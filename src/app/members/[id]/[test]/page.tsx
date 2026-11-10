import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { loadUser, requireUser } from "@/lib/auth";
import { one, query } from "@/lib/db";
import { fmtDate, getSignoffs } from "@/lib/data";
import { canAdminister, canViewMember, isEligible, isExaminer } from "@/lib/permissions";
import { computeProgress } from "@/lib/progress";
import { getSheet, versionLabel } from "@/lib/sheets";
import { CREDIT_LABEL, CREDIT_MARK, ENDORSEMENT_LABEL, RANK_LABEL, circled, sheetHeading, type CreditKind } from "@/lib/tests";
import { Flash } from "@/components/Flash";
import { SheetChecklist, type SectionVM } from "./SheetChecklist";
import { PrintSheet } from "./PrintSheet";

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
  const self = user.id === id;

  const sections: SectionVM[] = test.sections.map((sec) => ({
    key: sec.key, title: sec.title, note: sec.note,
    items: sec.items.map((it) => {
      const s = byItem.get(it.key);
      return {
        key: it.key, title: it.title, details: it.details,
        mark: it.credit && !sec.title.includes(CREDIT_MARK[it.credit]) ? CREDIT_MARK[it.credit] : "",
        creditLabel: it.credit ? CREDIT_LABEL[it.credit] : undefined,
        signed: s ? {
          examiner: s.examiner_name, date: fmtDate(s.signed_at),
          credit: s.credit ? (CREDIT_LABEL[s.credit as CreditKind] ?? s.credit) : undefined,
          note: s.note ?? undefined,
          canRemove: canSign && (s.examiner_id === user.id || user.role !== "member"),
        } : undefined,
      };
    }),
  }));

  return (
    <>
      <nav className="crumbs screen-only" aria-label="Breadcrumb">
        {self ? <Link href="/">My progress</Link> : (
          <><Link href="/members">Members</Link><ChevronRight size={14} aria-hidden="true" /><Link href={`/members/${id}`}>{member.name}</Link></>
        )}
        <ChevronRight size={14} aria-hidden="true" />
        <span aria-current="page">{test.title}</span>
      </nav>
      <div className="screen-only"><Flash sp={sp} /></div>

      <SheetChecklist
        userId={id} testKey={testKey}
        candidate={member.name} candidateRank={RANK_LABEL[member.rank]}
        testTitle={test.title} heading={sheetHeading(test)} revision={test.revision}
        wind={test.minBaseWind !== undefined ? circled(test.minBaseWind) : undefined}
        notes={test.notes} sections={sections}
        done={progress.done} total={progress.total}
        canSign={canSign} canCredit={canCredit}
        ineligible={!completion && !eligible ? `${member.name} is not currently eligible for this test (rating: ${RANK_LABEL[member.rank]}).` : undefined}
        grants={test.grants.rank ? `promoted to ${RANK_LABEL[test.grants.rank]}` : `given ${ENDORSEMENT_LABEL[test.grants.endorsement!]} rights`}
        completion={completion ? { name: completion.name, date: fmtDate(completion.completed_at), version: completion.sheet_version } : undefined}
        version={versionLabel(test)}
        track={canTrack ? { on: tracking } : undefined}
        fresh={!!sp.completed}
        testers={testers.map((t) => ({ id: t.id, name: t.name, note: [t.tracking && "testing", t.signed > 0 && `${t.signed} signed`].filter(Boolean).join(", ") }))}
      />

      <PrintSheet test={test} candidate={member.name} sections={sections}
        completion={completion ? { name: completion.name, date: fmtDate(completion.completed_at) } : undefined} />
    </>
  );
}
