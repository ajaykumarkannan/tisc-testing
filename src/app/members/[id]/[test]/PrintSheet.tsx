import { Details } from "@/components/Details";
import { circled, sheetHeading, type TestDef } from "@/lib/tests";
import type { SectionVM } from "./SheetChecklist";

/** The paper-form layout, shown only when printing: item | Examiner signature & date. */
export function PrintSheet({ test, candidate, sections, completion }: {
  test: TestDef; candidate: string; sections: SectionVM[]; completion?: { name: string; date: string };
}) {
  return (
    <div className="paper print-only" aria-hidden="true">
      <table>
        <tbody>
          <tr>
            <td className="paper-title">{sheetHeading(test)}{test.revision > 0 && <span className="small"> (rev {test.revision})</span>}</td>
            {test.minBaseWind !== undefined && <td className="paper-wind"><b>{circled(test.minBaseWind)}</b>Min Base Wind</td>}
          </tr>
          {test.notes.length > 0 && (
            <tr><td colSpan={2} className="paper-notes">{test.notes.map((n, i) => <p key={i}>{n}</p>)}</td></tr>
          )}
        </tbody>
      </table>
      <table>
        <tbody>
          <tr>
            <td style={{ width: "50%" }}>Candidate Name:<div style={{ fontWeight: 700, fontSize: "12pt" }}>{candidate}</div></td>
            <td>
              Signature of final tester &amp; date of completion:
              {completion && <div><span className="who">{completion.name}</span> · {completion.date}</div>}
              <div className="small">(please notify TestComplete@torontosailing.com)</div>
            </td>
          </tr>
        </tbody>
      </table>
      {sections.map((sec) => (
        <table key={sec.key} className="paper-sec">
          <thead>
            <tr>
              <th>{sec.title}{sec.note && <span className="note">{sec.note}</span>}</th>
              <th className="sig-col">Examiner signature &amp; date</th>
            </tr>
          </thead>
          <tbody>
            {sec.items.map((it) => (
              <tr key={it.key}>
                <td><div className="item-title">{it.title}{it.mark && ` ${it.mark}`}</div><Details lines={it.details} /></td>
                <td className="sig-col">
                  {it.signed && (
                    <>
                      <span className="who">{it.signed.examiner}</span> · {it.signed.date}
                      {it.signed.credit && <div className="small">{it.signed.credit}</div>}
                      {it.signed.note && <div className="small">“{it.signed.note}”</div>}
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ))}
    </div>
  );
}
