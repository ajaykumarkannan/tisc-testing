import { randomInt } from "node:crypto";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { allowedStartingRanks, canAddMembers } from "@/lib/permissions";
import { RANK_LABEL } from "@/lib/tests";
import { addMember } from "@/app/actions";
import { Flash } from "@/components/Flash";

export const dynamic = "force-dynamic";

/** Easy to read aloud on the dock: no 0/O or 1/l/I. */
function tempPassword() {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  const part = () => Array.from({ length: 4 }, () => chars[randomInt(chars.length)]).join("");
  return `${part()}-${part()}-${part()}`;
}

export default async function NewMember({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const user = await requireUser();
  if (!canAddMembers(user)) redirect("/");
  const ranks = allowedStartingRanks(user);
  return (
    <div className="card" style={{ maxWidth: 480, margin: "0 auto" }}>
      <h1>Add a member</h1>
      <p className="muted">They’ll sign in with this email and temporary password, then choose their own password.</p>
      <Flash sp={await searchParams} />
      <form action={addMember}>
        <label><span>Full name</span><input name="name" required autoComplete="off" style={{ width: "100%" }} /></label>
        <label><span>Email</span><input name="email" type="email" required autoComplete="off" style={{ width: "100%" }} /></label>
        <label><span>Temporary password</span>
          <input name="password" type="text" required minLength={8} defaultValue={tempPassword()} autoComplete="off" style={{ width: "100%" }} />
        </label>
        {ranks.length > 1 ? (
          <label><span>Starting rating (for members who already passed on paper)</span>
            <select name="rank" defaultValue="novice">{ranks.map((r) => <option key={r} value={r}>{RANK_LABEL[r]}</option>)}</select>
          </label>
        ) : (
          <p className="muted small">New members start as {RANK_LABEL.novice}.<input type="hidden" name="rank" value="novice" /></p>
        )}
        <button>Add member</button>
      </form>
    </div>
  );
}
