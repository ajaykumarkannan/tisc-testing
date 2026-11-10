import { randomInt } from "node:crypto";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, UserPlus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { allowedStartingRanks, canAddMembers } from "@/lib/permissions";
import { RANK_LABEL } from "@/lib/tests";
import { addMember } from "@/app/actions";
import { Flash } from "@/components/Flash";
import { Field } from "@/components/AuthCard";
import { SubmitButton } from "@/components/SubmitButton";
import { PageHead } from "@/components/ui";

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
    <div style={{ maxWidth: 560, margin: "0 auto" }}>
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/members">Members</Link><ChevronRight size={14} aria-hidden="true" /><span aria-current="page">Add a member</span>
      </nav>
      <PageHead title="Add a member" sub="They’ll sign in with this email and temporary password, then choose their own password." />
      <Flash sp={await searchParams} />
      <form action={addMember} className="card">
        <Field label="Full name"><input className="input" name="name" required autoComplete="off" /></Field>
        <Field label="Email"><input className="input" name="email" type="email" required autoComplete="off" inputMode="email" /></Field>
        <Field label="Temporary password" hint="Suggested for you: easy to read aloud. Change it if you like (8+ characters).">
          <input className="input mono" name="password" type="text" required minLength={8} defaultValue={tempPassword()} autoComplete="off" />
        </Field>
        {ranks.length > 1 ? (
          <Field label="Starting rating" hint="For members who already passed on paper.">
            <select className="select" name="rank" defaultValue="novice">{ranks.map((r) => <option key={r} value={r}>{RANK_LABEL[r]}</option>)}</select>
          </Field>
        ) : (
          <p className="flash info" style={{ animation: "none" }}>New members start as {RANK_LABEL.novice}.<input type="hidden" name="rank" value="novice" /></p>
        )}
        <SubmitButton className="btn btn--primary btn--lg btn--block" pendingText="Adding…" icon={<UserPlus size={20} aria-hidden="true" />}>Add member</SubmitButton>
      </form>
    </div>
  );
}
