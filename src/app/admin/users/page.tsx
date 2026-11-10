import { Eye, Save, UserPlus } from "lucide-react";
import { getRealUser, requireAdmin } from "@/lib/auth";
import { query } from "@/lib/db";
import { ENDORSEMENTS, ENDORSEMENT_LABEL, RANKS, RANK_LABEL, type Endorsement, type Rank } from "@/lib/tests";
import { createUser, updateUser, viewAs } from "@/app/actions";
import { Flash } from "@/components/Flash";
import { Field } from "@/components/AuthCard";
import { SubmitButton } from "@/components/SubmitButton";
import { Avatar, PageHead } from "@/components/ui";

const ROLES = [["member", "Member"], ["committee", "Testing committee"], ["admin", "Administrator"]] as const;

export default async function Users({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireAdmin();
  const me = await getRealUser();
  const users = await query<{ id: number; name: string; email: string; role: string; rank: Rank; endorsements: Endorsement[] | null }>(
    `SELECT u.id, u.name, u.email, u.role, u.rank, array_remove(array_agg(e.endorsement), NULL) AS endorsements
       FROM users u LEFT JOIN endorsements e ON e.user_id=u.id GROUP BY u.id ORDER BY u.name`);
  return (
    <>
      <PageHead eyebrow="Administration" title="Users" sub="Add people, set roles and ratings, or reset a password. A password you set is temporary: they choose their own at next sign-in." />
      <Flash sp={await searchParams} />

      <form action={createUser} className="card add-user" aria-labelledby="add-h">
        <div className="card__head">
          <span className="card__icon"><UserPlus size={18} aria-hidden="true" /></span>
          <div><h2 id="add-h">Add a user</h2><div className="small muted">Set a rating directly for members who already passed on paper.</div></div>
        </div>
        <div className="add-grid">
          <Field label="Full name"><input className="input" name="name" required autoComplete="off" /></Field>
          <Field label="Email"><input className="input" name="email" type="email" required autoComplete="off" /></Field>
          <Field label="Temporary password"><input className="input" name="password" type="text" placeholder="8+ characters" minLength={8} required autoComplete="off" /></Field>
          <Field label="Role"><select className="select" name="role">{ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
          <Field label="Rating"><select className="select" name="rank">{RANKS.map((r) => <option key={r} value={r}>{RANK_LABEL[r]}</option>)}</select></Field>
          <SubmitButton pendingText="Adding…" icon={<UserPlus size={18} aria-hidden="true" />}>Add user</SubmitButton>
        </div>
      </form>

      <h2 className="section-title">Everyone <span className="count">{users.length}</span></h2>
      <section className="card card--flush">
        <ul className="users">{users.map((u) => (
          <li key={u.id}>
            <form action={updateUser} className="user-row">
              <input type="hidden" name="userId" value={u.id} />
              <div>
                <div className="user-row__id">
                  <Avatar name={u.name} />
                  <div className="grow">
                    <input className="input input--title" name="name" defaultValue={u.name} aria-label="Name" />
                  </div>
                </div>
                <div className="user-row__email">{u.email}{u.id === me?.id && <span className="chip" style={{ marginLeft: 8 }}>You</span>}</div>
              </div>
              <div className="user-row__fields">
                <Field label="Role"><select className="select" name="role" defaultValue={u.role} aria-label="Role">{ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
                <Field label="Rating"><select className="select" name="rank" defaultValue={u.rank} aria-label="Rating">{RANKS.map((r) => <option key={r} value={r}>{RANK_LABEL[r]}</option>)}</select></Field>
                <fieldset className="user-row__ends">
                  <legend className="sr-only">Endorsements</legend>
                  {ENDORSEMENTS.map((e) => (
                    <label key={e} className="check">
                      <input type="checkbox" className="checkbox" name={`end_${e}`} defaultChecked={(u.endorsements ?? []).includes(e)} /> {ENDORSEMENT_LABEL[e]}
                    </label>
                  ))}
                </fieldset>
                <Field label="New password"><input className="input" name="password" type="text" placeholder="(unchanged)" aria-label="New password" autoComplete="off" /></Field>
                <SubmitButton className="btn btn--secondary" pendingText="Saving…" icon={<Save size={17} aria-hidden="true" />}>Save</SubmitButton>
              </div>
            </form>
            {u.id !== me?.id && (
              <form action={viewAs} className="view-as-form">
                <input type="hidden" name="userId" value={u.id} />
                <SubmitButton className="btn btn--ghost btn--sm" icon={<Eye size={15} aria-hidden="true" />}>View as {u.name}</SubmitButton>
              </form>
            )}
          </li>))}
        </ul>
      </section>
    </>
  );
}
