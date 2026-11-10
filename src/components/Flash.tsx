export function Flash({ sp }: { sp: Record<string, string | string[] | undefined> }) {
  const err = typeof sp.error === "string" ? sp.error : null;
  return (
    <>
      {err && <p className="flash error" role="alert">{err}</p>}
      {sp.saved && <p className="flash ok">Sheet saved.</p>}
      {sp.added && <p className="flash ok">Member added. Give them their email and temporary password; they’ll choose their own password when they first sign in.</p>}
      {sp.completed && <p className="flash ok">Test completed and status updated. Please notify TestComplete@torontosailing.com.</p>}
      {(sp.changed || sp.password === "changed") && <p className="flash ok">Password changed. Any other signed-in devices have been signed out.</p>}
    </>
  );
}
