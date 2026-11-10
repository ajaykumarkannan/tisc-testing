import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { fmtDate } from "@/lib/data";
import { canEditSheets } from "@/lib/permissions";
import { getSheet } from "@/lib/sheets";
import { contentOf } from "@/lib/tests";
import { resetSheet, saveSheet } from "@/app/actions";
import { Flash } from "@/components/Flash";
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
      <h1>Edit sheet: {sheet.title}</h1>
      <Flash sp={await searchParams} />
      <p className="muted">
        Edits apply to tests in progress straight away. Existing sign-offs stay attached to items you keep, even if
        you reword them. If you delete an item, its sign-offs no longer count. Completed tests are not affected.
      </p>
      <SheetEditor testKey={key} revision={sheet.revision} initial={contentOf(sheet)} action={saveSheet} />
      <h2>History</h2>
      {history.length === 0 ? <p className="muted">Unchanged from the 2026 handbook.</p> : (
        <ul>{history.map((h) => <li key={h.revision}>Rev {h.revision} · {fmtDate(h.updated_at)} · {h.name ?? "unknown"}</li>)}</ul>
      )}
      {sheet.revision > 0 && (
        <form action={resetSheet}>
          <input type="hidden" name="testKey" value={key} />
          <input type="hidden" name="revision" value={sheet.revision} />
          <button className="danger">Restore handbook version</button>
        </form>
      )}
    </>
  );
}
