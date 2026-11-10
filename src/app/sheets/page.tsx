import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, ClipboardList } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { canEditSheets } from "@/lib/permissions";
import { sheetList, versionLabel } from "@/lib/sheets";
import { ENDORSEMENT_LABEL, RANK_LABEL, circled, itemCount } from "@/lib/tests";
import { PageHead } from "@/components/ui";

export default async function Sheets() {
  const user = await requireUser();
  if (!canEditSheets(user)) redirect("/");
  const sheets = await sheetList();
  return (
    <>
      <PageHead eyebrow="Testing committee" title="Testing sheets"
        sub="Edit the content of each sheet. Who may take a test and what it grants are fixed by the club’s progression rules." />
      <div className="grid">
        {sheets.map((t) => (
          <Link key={t.key} href={`/sheets/${t.key}`} className="test-card sheet-tile">
            <div className="card__head">
              <span className="card__icon"><ClipboardList size={18} aria-hidden="true" /></span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="test-card__title">{t.title}</div>
                <div className="test-card__grants">{t.revision ? versionLabel(t) : `${t.sheetVersion} (handbook)`}</div>
              </div>
              {t.revision > 0 && <span className="chip chip--gold">Edited</span>}
            </div>
            <dl className="kv">
              <dt>Eligible</dt><dd>{t.eligibleRanks.map((r) => RANK_LABEL[r]).join(", ")}</dd>
              <dt>Grants</dt><dd>{t.grants.rank ? RANK_LABEL[t.grants.rank] : `${ENDORSEMENT_LABEL[t.grants.endorsement!]} rights`}</dd>
              <dt>Items</dt><dd>{itemCount(t)}</dd>
              {t.minBaseWind !== undefined && <><dt>Min base wind</dt><dd>{circled(t.minBaseWind)}</dd></>}
            </dl>
            <div className="test-card__foot">
              <span className="muted">{t.sections.length} sections</span>
              <span className="test-card__cta">Edit sheet<ArrowRight size={16} aria-hidden="true" /></span>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
