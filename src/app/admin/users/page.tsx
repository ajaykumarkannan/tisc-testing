import { requireAdmin } from "@/lib/auth";
import { query } from "@/lib/db";
import { ENDORSEMENTS, ENDORSEMENT_LABEL, RANKS, RANK_LABEL, type Endorsement, type Rank } from "@/lib/tests";
import { createUser, updateUser } from "@/app/actions";
import { Flash } from "@/components/Flash";

const ROLES = [["member", "Member"], ["committee", "Testing committee"], ["admin", "Administrator"]] as const;

export default async function Users({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireAdmin();
  const users = await query<{ id: number; name: string; email: string; role: string; rank: Rank; endorsements: Endorsement[] | null }>(
    `SELECT u.id, u.name, u.email, u.role, u.rank, array_remove(array_agg(e.endorsement), NULL) AS endorsements
       FROM users u LEFT JOIN endorsements e ON e.user_id=u.id GROUP BY u.id ORDER BY u.name`);
  return (
    <>
      <h1>Users</h1>
      <Flash sp={await searchParams} />
      <form action={createUser} className="card add-user">
        <h2 style={{ marginTop: 0 }}>Add a user</h2>
        <div className="row">
          <input name="name" placeholder="Full name" required className="grow" />
          <input name="email" type="email" placeholder="Email" required className="grow" />
          <input name="password" type="text" placeholder="Temporary password (8+)" minLength={8} required />
          <select name="role">{ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          <select name="rank">{RANKS.map((r) => <option key={r} value={r}>{RANK_LABEL[r]}</option>)}</select>
          <button>Add</button>
        </div>
        <p className="muted small">Set a rating directly for members who already passed on paper.</p>
      </form>

      <div className="scroll"><table className="list users">
        <thead className="desktop-only"><tr><th>Name / email</th><th>Role</th><th>Rating</th><th>Endorsements</th><th>New password</th><th /></tr></thead>
        <tbody>{users.map((u) => (
          <tr key={u.id}>
            <td colSpan={6} style={{ padding: 0 }}>
              <form action={updateUser} className="row user-row" style={{ padding: 8 }}>
                <input type="hidden" name="userId" value={u.id} />
                <span className="grow user-name"><input name="name" defaultValue={u.name} aria-label="Name" style={{ width: "100%" }} /><br /><span className="muted small email">{u.email}</span></span>
                <select name="role" defaultValue={u.role} aria-label="Role">{ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
                <select name="rank" defaultValue={u.rank} aria-label="Rating">{RANKS.map((r) => <option key={r} value={r}>{RANK_LABEL[r]}</option>)}</select>
                {ENDORSEMENTS.map((e) => (
                  <label key={e} className="small check" style={{ margin: 0 }}>
                    <input type="checkbox" name={`end_${e}`} defaultChecked={(u.endorsements ?? []).includes(e)} /> {ENDORSEMENT_LABEL[e]}
                  </label>
                ))}
                <label className="user-pw" style={{ margin: 0 }}><span className="mobile-only">New password</span><input name="password" type="text" placeholder="(unchanged)" aria-label="New password" style={{ width: 130 }} /></label>
                <button className="secondary">Save</button>
              </form>
            </td>
          </tr>))}
        </tbody>
      </table></div>
    </>
  );
}
