import { CircleAlert, CircleCheck } from "lucide-react";

const Ok = ({ children }: { children: React.ReactNode }) => (
  <div className="flash ok" role="status"><CircleCheck size={18} aria-hidden="true" /><span>{children}</span></div>
);

/** Inline banners driven by the ?error= / ?saved= … query params that server actions redirect with. */
export function Flash({ sp }: { sp: Record<string, string | string[] | undefined> }) {
  const err = typeof sp.error === "string" ? sp.error : null;
  return (
    <>
      {err && <div className="flash error" role="alert"><CircleAlert size={18} aria-hidden="true" /><span>{err}</span></div>}
      {sp.saved && <Ok>Sheet saved.</Ok>}
      {sp.added && <Ok>Member added. Give them their email and temporary password; they’ll choose their own password when they first sign in.</Ok>}
      {sp.exception && <Ok>Exception granted. The test is now open for this member.</Ok>}
      {sp.completed && <Ok>Test completed and status updated. Please notify TestComplete@torontosailing.com.</Ok>}
      {(sp.changed || sp.password === "changed") && <Ok>Password changed. Any other signed-in devices have been signed out.</Ok>}
    </>
  );
}
