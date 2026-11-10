export function ProgressBar({ done, total }: { done: number; total: number }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className="bar"><span style={{ width: `${pct}%` }} /></div>
      <span className="muted">{done}/{total} signed</span>
    </div>
  );
}
