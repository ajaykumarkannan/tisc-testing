/** Renders an item's detail lines using the sheet conventions: bullet / "> plain" / "## heading". */
export function Details({ lines }: { lines: string[] }) {
  if (!lines.length) return null;
  const out: React.ReactNode[] = [];
  let bullets: string[] = [];
  const flush = () => {
    if (bullets.length) out.push(<ul key={out.length}>{bullets.map((b, i) => <li key={i}>{b}</li>)}</ul>);
    bullets = [];
  };
  for (const l of lines) {
    if (l.startsWith("## ")) { flush(); out.push(<div key={out.length} className="item-title sub">{l.slice(3)}</div>); }
    else if (l.startsWith("> ")) { flush(); out.push(<p key={out.length} className="plain">{l.slice(2)}</p>); }
    else bullets.push(l);
  }
  flush();
  return <>{out}</>;
}

/** Number of signature-relevant detail lines, for the "Details (n)" toggle label. */
export const detailCount = (lines: string[]) => lines.filter((l) => !l.startsWith("## ")).length;
