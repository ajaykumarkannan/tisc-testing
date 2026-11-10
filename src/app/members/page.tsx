import Link from "next/link";
import { redirect } from "next/navigation";
import { UserPlus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { canAddMembers, isExaminer } from "@/lib/permissions";
import { computeProgress } from "@/lib/progress";
import { getSheets } from "@/lib/sheets";
import { RANKS, effectiveEndorsements, type Endorsement, type Rank } from "@/lib/tests";
import { PageHead } from "@/components/ui";
import { MembersList, type MemberVM } from "./MembersList";

export default async function Members({ searchParams }: { searchParams: Promise<{ q?: string; rank?: string }> }) {
  const user = await requireUser();
  if (!isExaminer(user)) redirect("/");
  const { q = "", rank = "" } = await searchParams;
  // All members are loaded (capped) and filtered as you type; ?q / ?rank still work without JavaScript.
  const rows = await query<{ id: number; name: string; email: string; rank: Rank; endorsements: Endorsement[] | null }>(
    `SELECT u.id, u.name, u.email, u.rank, array_remove(array_agg(e.endorsement), NULL) AS endorsements
       FROM users u LEFT JOIN endorsements e ON e.user_id = u.id
      GROUP BY u.id ORDER BY u.name LIMIT 500`);
  const ids = rows.map((r) => r.id);
  const [open, sheets] = await Promise.all([
    ids.length ? query<{ user_id: number; test_key: string; keys: string[] }>(
      `SELECT s.user_id, s.test_key, array_agg(s.item_key) AS keys FROM signoffs s
        WHERE s.user_id = ANY($1::int[])
          AND NOT EXISTS (SELECT 1 FROM completions c WHERE c.user_id=s.user_id AND c.test_key=s.test_key)
        GROUP BY s.user_id, s.test_key`, [ids]) : Promise.resolve([]),
    getSheets(),
  ]);
  const members: MemberVM[] = rows.map((m) => ({
    id: m.id, name: m.name, email: m.email, rank: m.rank,
    endorsements: effectiveEndorsements(m.rank, m.endorsements ?? []),
    tests: open.filter((o) => o.user_id === m.id && sheets[o.test_key]).map((o) => {
      const p = computeProgress(sheets[o.test_key], o.keys);
      return { key: o.test_key, title: sheets[o.test_key].title, done: p.done, total: p.total };
    }),
  }));

  return (
    <>
      <PageHead eyebrow="Examiner" title="Members" sub="Find a member, then open the test you’re running."
        actions={canAddMembers(user) && <Link href="/members/new" className="btn btn--primary"><UserPlus size={18} aria-hidden="true" />Add member</Link>} />
      <MembersList members={members} initialQ={q} initialRank={RANKS.includes(rank as Rank) ? (rank as Rank) : ""} />
    </>
  );
}
