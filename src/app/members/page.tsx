import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { canAddMembers, isExaminer } from "@/lib/permissions";
import { ENDORSEMENT_LABEL, RANK_LABEL, RANKS, effectiveEndorsements, type Endorsement, type Rank } from "@/lib/tests";

export default async function Members({ searchParams }: { searchParams: Promise<{ q?: string; rank?: string }> }) {
  const user = await requireUser();
  if (!isExaminer(user)) redirect("/");
  const { q = "", rank = "" } = await searchParams;
  const rows = await query<{ id: number; name: string; email: string; rank: Rank; endorsements: Endorsement[] | null }>(
    `SELECT u.id, u.name, u.email, u.rank, array_remove(array_agg(e.endorsement), NULL) AS endorsements
       FROM users u LEFT JOIN endorsements e ON e.user_id = u.id
      WHERE ($1 = '' OR u.name ILIKE '%' || $1 || '%' OR u.email ILIKE '%' || $1 || '%')
        AND ($2 = '' OR u.rank = $2)
      GROUP BY u.id ORDER BY u.name LIMIT 200`, [q, RANKS.includes(rank as Rank) ? rank : ""]);
  return (
    <>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h1>Members</h1>
        {canAddMembers(user) && <Link href="/members/new" className="btn">+ Add member</Link>}
      </div>
      <form className="row card">
        <input name="q" defaultValue={q} placeholder="Search name or email" className="grow" />
        <select name="rank" defaultValue={rank}>
          <option value="">All ratings</option>
          {RANKS.map((r) => <option key={r} value={r}>{RANK_LABEL[r]}</option>)}
        </select>
        <button>Search</button>
      </form>
      <div className="scroll"><table className="list">
        <thead><tr><th>Name</th><th>Rating</th><th>Email</th></tr></thead>
        <tbody>{rows.map((m) => (
          <tr key={m.id}>
            <td><Link href={`/members/${m.id}`}>{m.name}</Link></td>
            <td>{RANK_LABEL[m.rank]}{effectiveEndorsements(m.rank, m.endorsements ?? []).map((e) => <span key={e} className="badge" style={{ marginLeft: 6 }}>{ENDORSEMENT_LABEL[e]}</span>)}</td>
            <td className="muted">{m.email}</td>
          </tr>))}
        </tbody>
      </table></div>
      {rows.length === 0 && <p className="muted">No members found.</p>}
    </>
  );
}
