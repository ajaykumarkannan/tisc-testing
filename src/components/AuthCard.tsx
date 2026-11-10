import { Sailboat } from "lucide-react";

/** Centered card used by sign-in, first-time setup and sign-up. */
export function AuthCard({ title, sub, children, foot }: {
  title: string; sub?: React.ReactNode; children: React.ReactNode; foot?: React.ReactNode;
}) {
  return (
    <div className="auth">
      <div className="auth__card">
        <div className="card">
          <div className="auth__head">
            <div className="auth__mark"><Sailboat size={30} aria-hidden="true" /></div>
            <h1>{title}</h1>
            {sub && <p>{sub}</p>}
          </div>
          {children}
        </div>
        {foot && <div className="auth__foot">{foot}</div>}
      </div>
    </div>
  );
}

export function Field({ label, hint, children }: { label: React.ReactNode; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      {children}
      {hint && <span className="field__hint">{hint}</span>}
    </label>
  );
}
