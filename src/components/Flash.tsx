export function Flash({ sp }: { sp: Record<string, string | string[] | undefined> }) {
  const err = typeof sp.error === "string" ? sp.error : null;
  return (
    <>
      {err && <p className="flash error" role="alert">{err}</p>}
      {sp.saved && <p className="flash ok">Sheet saved.</p>}
      {sp.completed && <p className="flash ok">Test completed. Please notify TestComplete@torontosailing.com.</p>}
    </>
  );
}
