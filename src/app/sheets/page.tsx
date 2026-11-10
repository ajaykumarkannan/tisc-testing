import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { canEditSheets } from "@/lib/permissions";
import { sheetList, versionLabel } from "@/lib/sheets";
import { ENDORSEMENT_LABEL, RANK_LABEL, itemCount } from "@/lib/tests";

export default async function Sheets() {
  const user = await requireUser();
  if (!canEditSheets(user)) redirect("/");
  const sheets = await sheetList();
  return (
    <>
      <h1>Testing sheets</h1>
      <p className="muted">The testing committee can edit the content of each sheet. Who may take a test and what it grants are fixed by the club’s progression rules.</p>
      <div className="scroll"><table className="list">
        <thead><tr><th>Sheet</th><th>Eligible</th><th>Grants</th><th>Items</th><th>Version</th></tr></thead>
        <tbody>{sheets.map((t) => (
          <tr key={t.key}>
            <td><Link href={`/sheets/${t.key}`}>{t.title}</Link></td>
            <td>{t.eligibleRanks.map((r) => RANK_LABEL[r]).join(", ")}</td>
            <td>{t.grants.rank ? RANK_LABEL[t.grants.rank] : `${ENDORSEMENT_LABEL[t.grants.endorsement!]} rights`}</td>
            <td>{itemCount(t)}</td>
            <td className="muted">{t.revision ? versionLabel(t) : `${t.sheetVersion} (handbook)`}</td>
          </tr>))}
        </tbody>
      </table></div>
    </>
  );
}
