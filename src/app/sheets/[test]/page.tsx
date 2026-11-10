import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronRight, History, RotateCcw } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { fmtDate } from "@/lib/data";
import { canEditSheets } from "@/lib/permissions";
import { getSheet, versionLabel } from "@/lib/sheets";
import { contentOf } from "@/lib/tests";
import { resetSheet, saveSheet } from "@/app/actions";
import { Flash } from "@/components/Flash";
import { SubmitButton } from "@/components/SubmitButton";
import { PageHead } from "@/components/ui";
import { SheetEditor } from "./SheetEditor";

export default async function EditSheet({ params, searchParams }: {
  params: Promise<{ test: string }>; searchParams: Promise<Record<string, string>>;
}) {
  const user = await requireUser();
  if (!canEditSheets(user)) redirect("/");
  const { test: key } = await params;
  const sheet = await getSheet(key);
  if (!sheet) notFound();
  const history = await query<{ revision: number; updated_at: Date; name: string | null }>(
    `SELECT r.revision, r.updated_at, u.name FROM test_sheet_revisions r LEFT JOIN users u ON u.id=r.updated_by
      WHERE r.test_key=$1 ORDER BY r.revision DESC LIMIT 20`, [key]);
  return (
    <>
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/sheets">Testing sheets</Link><ChevronRight size={14} aria-hidden="true" /><span aria-current="page">{sheet.title}</span>
      </nav>
      <PageHead eyebrow={`Sheet ${versionLabel(sheet)}`} title={`Edit sheet: ${sheet.title}`}
        sub="Edits apply to tests in progress straight away. Existing sign-offs stay attached to items you keep, even if you reword them. If you delete an item, its sign-offs no longer count. Completed tests are not affected." />
      <Flash sp={await searchParams} />
      <SheetEditor key={sheet.revision} testKey={key} revision={sheet.revision} initial={contentOf(sheet)} action={saveSheet} />

      <div className="grid-fit" style={{ marginTop: "var(--s-6)", alignItems: "start" }}>
        <section className="card" aria-labelledby="hist-h">
          <div className="card__head">
            <span className="card__icon"><History size={18} aria-hidden="true" /></span>
            <h2 id="hist-h">History</h2>
          </div>
          {history.length === 0 ? <p className="muted small">Unchanged from the 2026 handbook.</p> : (
            <ol className="timeline">{history.map((h) => (
              <li key={h.revision}><b>Rev {h.revision}</b> · {fmtDate(h.updated_at)} · <span className="muted">{h.name ?? "unknown"}</span></li>
            ))}</ol>
          )}
        </section>
        {sheet.revision > 0 && (
          <section className="card danger-zone" aria-labelledby="reset-h">
            <div className="card__head">
              <span className="card__icon" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}><RotateCcw size={18} aria-hidden="true" /></span>
              <div><h2 id="reset-h">Restore handbook text</h2><div className="small muted">Saved as a new revision, so history is kept.</div></div>
            </div>
            <form action={resetSheet}>
              <input type="hidden" name="testKey" value={key} />
              <input type="hidden" name="revision" value={sheet.revision} />
              <SubmitButton className="btn btn--danger" pendingText="Restoring…" icon={<RotateCcw size={17} aria-hidden="true" />}>Restore handbook version</SubmitButton>
            </form>
          </section>
        )}
      </div>
    </>
  );
}
