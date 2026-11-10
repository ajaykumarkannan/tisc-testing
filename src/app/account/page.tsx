import { KeyRound, ShieldAlert } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { MIN_PASSWORD } from "@/lib/password";
import { changePassword } from "../actions";
import { Flash } from "@/components/Flash";
import { Field } from "@/components/AuthCard";
import { SubmitButton } from "@/components/SubmitButton";
import { Avatar, EndorsementChip, PageHead, RankChip } from "@/components/ui";

const ROLE_LABEL = { admin: "Administrator", committee: "Testing committee", member: "Member" } as const;

export default async function AccountPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const user = await requireUser({ allowPendingPasswordChange: true });
  const sp = await searchParams;
  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <PageHead title="My account" sub={user.mustChangePassword ? undefined : "Your profile and sign-in details."} />
      {user.mustChangePassword && (
        <div className="flash warn" role="status">
          <ShieldAlert size={18} aria-hidden="true" />
          <span>Your password was set by an administrator. Please choose your own password to continue.</span>
        </div>
      )}
      <Flash sp={sp} />

      <section className="card" aria-label="Profile">
        <div className="row" style={{ gap: "var(--s-4)", flexWrap: "nowrap" }}>
          <Avatar name={user.name} size="lg" />
          <div style={{ minWidth: 0 }}>
            <div className="strong" style={{ fontSize: "var(--fs-lg)" }}>{user.name}</div>
            <div className="muted small" style={{ overflowWrap: "anywhere" }}>{user.email}</div>
            <div className="chips" style={{ marginTop: "var(--s-2)" }}>
              <RankChip rank={user.rank} />
              {user.endorsements.map((e) => <EndorsementChip key={e} e={e} />)}
              {user.role !== "member" && <span className="chip">{ROLE_LABEL[user.role]}</span>}
            </div>
          </div>
        </div>
      </section>

      <section className="card" aria-labelledby="pw-h">
        <div className="card__head">
          <span className="card__icon"><KeyRound size={18} aria-hidden="true" /></span>
          <div>
            <h2 id="pw-h">Change password</h2>
            <div className="small muted">Changing your password signs you out on every other device.</div>
          </div>
        </div>
        <form action={changePassword}>
          <Field label="Current password">
            <input className="input" name="current_password" type="password" required autoComplete="current-password" />
          </Field>
          <Field label="New password" hint={`${MIN_PASSWORD} or more characters.`}>
            <input className="input" name="new_password" type="password" minLength={MIN_PASSWORD} required autoComplete="new-password" />
          </Field>
          <Field label="Confirm new password">
            <input className="input" name="confirm_password" type="password" minLength={MIN_PASSWORD} required autoComplete="new-password" />
          </Field>
          <SubmitButton pendingText="Saving…" className="btn btn--primary">Change password</SubmitButton>
        </form>
      </section>
    </div>
  );
}
