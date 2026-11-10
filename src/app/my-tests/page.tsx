import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { fmtDate } from "@/lib/data";
import { isExaminer } from "@/lib/permissions";
import { computeProgress } from "@/lib/progress";
import { getSheets } from "@/lib/sheets";
import { untrackTest } from "@/app/actions";
import { Flash } from "@/components/Flash";
import { ProgressBar } from "@/components/Progress";

export const dynamic = "force-dynamic";

interface Row {
  user_id: number; test_key: string; name: string;
  my_count: number | null; my_last: Date | null; tracked_at: Date | null; completed_at: Date | null;
}

/** Candidates the examiner has signed for, or is tracking. */
export default async function MyTests({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const user = await requireUser();
  if (!isExaminer(user)) redirect("/");
  const rows = await query<Row>(
    `WITH mine AS (
        SELECT user_id, test_key, count(*)::int AS my_count, max(signed_at) AS my_last
          FROM signoffs WHERE examiner_id=$1 GROUP BY user_id, test_key),
      tracked AS (SELECT user_id, test_key, created_at AS tracked_at FROM tracked_tests WHERE examiner_id=$1),
      pairs AS (SELECT user_id, test_key FROM mine UNION SELECT user_id, test_key FROM tracked)
     SELECT p.user_id, p.test_key, u.name, m.my_count, m.my_last, t.tracked_at, c.completed_at
       FROM pairs p
       JOIN users u ON u.id = p.user_id
       LEFT JOIN mine m ON m.user_id=p.user_id AND m.test_key=p.test_key
       LEFT JOIN tracked t ON t.user_id=p.user_id AND t.test_key=p.test_key
       LEFT JOIN completions c ON c.user_id=p.user_id AND c.test_key=p.test_key
      WHERE p.user_id <> $1`, [user.id]);
  const sheets = await getSheets();
  const ids = [...new Set(rows.map((r) => r.user_id))];
  const signed = ids.length
    ? await query<{ user_id: number; test_key: string; item_key: string }>(
        "SELECT user_id, test_key, item_key FROM signoffs WHERE user_id = ANY($1::int[])", [ids])
    : [];
  const keysFor = (uid: number, tk: string) => signed.filter((s) => s.user_id === uid && s.test_key === tk).map((s) => s.item_key);
  const items = rows.filter((r) => sheets[r.test_key]).map((r) => {
    const last = [r.my_last, r.tracked_at].filter(Boolean).map((d) => new Date(d!).getTime());
    return { ...r, test: sheets[r.test_key], progress: computeProgress(sheets[r.test_key], keysFor(r.user_id, r.test_key)), sortAt: Math.max(0, ...last) };
  });
  const active = items.filter((i) => !i.completed_at).sort((a, b) => b.sortAt - a.sortAt);
  const done = items.filter((i) => i.completed_at).sort((a, b) => +new Date(b.completed_at!) - +new Date(a.completed_at!));

  const card = (i: (typeof items)[number]) => (
    <div key={`${i.user_id}-${i.test_key}`} className="card my-test">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <Link href={`/members/${i.user_id}/${i.test_key}`}><strong>{i.name}</strong> · {i.test.title}</Link>
        <span>
          {i.tracked_at && <span className="badge">Tracking</span>}
          {i.completed_at && <span className="badge ok">Completed {fmtDate(i.completed_at)}</span>}
        </span>
      </div>
      {!i.completed_at && <ProgressBar done={i.progress.done} total={i.progress.total} />}
      <div className="row muted small" style={{ justifyContent: "space-between" }}>
        <span>{i.my_count ? `You signed ${i.my_count} item${i.my_count === 1 ? "" : "s"}, last ${fmtDate(i.my_last!)}` : "You haven’t signed anything yet"}</span>
        {i.tracked_at && (
          <form action={untrackTest}>
            <input type="hidden" name="userId" value={i.user_id} />
            <input type="hidden" name="testKey" value={i.test_key} />
            <input type="hidden" name="back" value="my-tests" />
            <button className="link small">Stop tracking</button>
          </form>
        )}
      </div>
    </div>
  );

  return (
    <>
      <h1>My tests</h1>
      <Flash sp={await searchParams} />
      <p className="muted">Candidates you’ve signed for, plus anyone you’ve marked “I’m testing this candidate” on their sheet.</p>
      <h2>In progress ({active.length})</h2>
      {active.length ? active.map(card) : <p className="muted">Nothing in progress. Open a member’s test sheet and tap “I’m testing this candidate” to track it here.</p>}
      {done.length > 0 && (<><h2>Completed ({done.length})</h2>{done.map(card)}</>)}
    </>
  );
}
