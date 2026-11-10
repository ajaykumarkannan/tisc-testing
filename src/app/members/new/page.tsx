import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { allowedStartingRanks, canAddMembers } from "@/lib/permissions";
import { RANK_LABEL } from "@/lib/tests";
import { addMember } from "@/app/actions";
import { Flash } from "@/components/Flash";
import { TempPassword } from "@/components/TempPassword";
import { tempPassword } from "@/lib/temp-password";

export const dynamic = "force-dynamic";

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
          <TempPassword initial={tempPassword()} required />
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
