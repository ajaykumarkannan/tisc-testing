import { requireUser } from "@/lib/auth";
import { MIN_PASSWORD } from "@/lib/password";
import { RANK_LABEL } from "@/lib/tests";
import { changePassword } from "../actions";
import { Flash } from "@/components/Flash";

export default async function AccountPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const user = await requireUser({ allowPendingPasswordChange: true });
  const sp = await searchParams;
  return (
    <>
      <h1>My account</h1>
      {user.mustChangePassword && (
        <p className="flash error" role="status">Your password was set by an administrator. Please choose your own password to continue.</p>
      )}
      <Flash sp={sp} />
      <div className="card" style={{ maxWidth: 420 }}>
        <p style={{ marginTop: 0 }}><b>{user.name}</b><br /><span className="muted">{user.email} · {RANK_LABEL[user.rank]}</span></p>
        <h2>Change password</h2>
        <form action={changePassword}>
          <label><span>Current password</span>
            <input name="current_password" type="password" required autoComplete="current-password" style={{ width: "100%" }} /></label>
          <label><span>New password ({MIN_PASSWORD}+ characters)</span>
            <input name="new_password" type="password" minLength={MIN_PASSWORD} required autoComplete="new-password" style={{ width: "100%" }} /></label>
          <label><span>Confirm new password</span>
            <input name="confirm_password" type="password" minLength={MIN_PASSWORD} required autoComplete="new-password" style={{ width: "100%" }} /></label>
          <button>Change password</button>
        </form>
        <p className="muted small">Changing your password signs you out on every other device.</p>
      </div>
    </>
  );
}
