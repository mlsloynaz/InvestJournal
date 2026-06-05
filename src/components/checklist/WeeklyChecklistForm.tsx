import type { ReactNode } from "react";
import { WeeklyChecklist } from "@prisma/client";
import { MetRadio } from "@/components/checklist/MetRadio";
import { saveWeeklyChecklist } from "@/server/actions/weekly";
import { decimalToString } from "@/lib/utils";

type Props = {
  symbol: string;
  weekStart: string;
  checklist: WeeklyChecklist | null;
};

function bidAskDifferenceDisplay(c: WeeklyChecklist | null): string {
  if (!c) return "";
  if (c.bid != null && c.ask == null) return decimalToString(c.bid);
  if (c.bid != null && c.ask != null) {
    const diff = Number(c.ask) - Number(c.bid);
    return Number.isFinite(diff) ? String(diff) : "";
  }
  return "";
}

export function WeeklyChecklistForm({ symbol, weekStart, checklist }: Props) {
  const c = checklist;

  return (
    <form action={saveWeeklyChecklist} className="space-y-4">
      <input type="hidden" name="symbol" value={symbol} />
      <input type="hidden" name="weekStart" value={weekStart} />

      <table className="data-table">
        <thead>
          <tr>
            <th className="w-10">No</th>
            <th>Requisitos</th>
            <th className="w-36 text-center">Se cumple</th>
            <th>Notas</th>
          </tr>
        </thead>
        <tbody>
          <ChecklistRow
            no="1"
            title="Reunión FED"
            hint="Cada ~45 días"
            metName="fedMet"
            metValue={c?.fedMet ?? null}
            noteName="fedNote"
            noteValue={c?.fedNote ?? ""}
          />
          <ChecklistRow
            no="2"
            title="Earnings"
            hint="Cada 3 meses"
            metName="earningsMet"
            metValue={c?.earningsMet ?? null}
            noteName="earningsNote"
            noteValue={c?.earningsNote ?? ""}
            extra={
              <input
                type="date"
                name="nextEarningsDate"
                defaultValue={
                  c?.nextEarningsDate
                    ? c.nextEarningsDate.toISOString().slice(0, 10)
                    : ""
                }
                className="mt-1 w-full"
                title="Próximo earnings"
              />
            }
          />
          <tr>
            <td>3</td>
            <td>
              <strong>Bollinger</strong>
              <p className="text-xs text-gray-600 mt-1">
                15m / Hora / Daily — punto medio (resistencia / soporte)
              </p>
            </td>
            <td>
              <MetRadio name="bollingerMet" value={c?.bollingerMet ?? null} />
            </td>
            <td>
              <textarea
                name="bollingerMidpointNote"
                defaultValue={c?.bollingerMidpointNote ?? ""}
                rows={2}
                className="w-full"
              />
            </td>
          </tr>
          <ChecklistRow
            no="4"
            title="Promedios móviles"
            hint="Techos / Pisos — analizar HORA/DÍA"
            metName="maMet"
            metValue={c?.maMet ?? null}
            noteName="maTimeframes"
            noteValue={c?.maTimeframes ?? ""}
            notePlaceholder="ej. 1h, 1d"
          />
          <ChecklistRow
            no="5"
            title="Puntos de ruptura líneas de tendencia"
            metName="trendBreakMet"
            metValue={c?.trendBreakMet ?? null}
            noteName="trendBreakNote"
            noteValue={c?.trendBreakNote ?? ""}
            noteIsTextarea
          />
          <tr>
            <td>6</td>
            <td>
              <strong>Gaps</strong>
              <p className="text-xs">Gap up / Gap down</p>
            </td>
            <td className="text-xs">
              <div className="mb-2">Up: <MetRadio name="gapUpMet" value={c?.gapUpMet ?? null} /></div>
              <div>Down: <MetRadio name="gapDownMet" value={c?.gapDownMet ?? null} /></div>
            </td>
            <td>
              <textarea name="gapNote" defaultValue={c?.gapNote ?? ""} rows={2} className="w-full" />
            </td>
          </tr>
          <tr>
            <td>7</td>
            <td>
              <strong>Bid - Ask</strong>
              <p className="text-xs text-gray-600 mt-1">Precio BID − ASK (diferencia)</p>
            </td>
            <td>
              <MetRadio name="bidAskMet" value={c?.bidAskMet ?? null} />
            </td>
            <td>
              <input
                name="bidAskDifference"
                placeholder="Ask − Bid"
                defaultValue={bidAskDifferenceDisplay(c)}
                className="w-full"
              />
            </td>
          </tr>
        </tbody>
      </table>

      <button type="submit">Guardar análisis básico</button>
    </form>
  );
}

function ChecklistRow({
  no,
  title,
  hint,
  metName,
  metValue,
  noteName,
  noteValue,
  notePlaceholder,
  noteIsTextarea,
  extra,
}: {
  no: string;
  title: string;
  hint?: string;
  metName: string;
  metValue: boolean | null;
  noteName: string;
  noteValue: string;
  notePlaceholder?: string;
  noteIsTextarea?: boolean;
  extra?: ReactNode;
}) {
  return (
    <tr>
      <td>{no}</td>
      <td>
        <strong>{title}</strong>
        {hint && <p className="text-xs text-gray-600">{hint}</p>}
        {extra}
      </td>
      <td>
        <MetRadio name={metName} value={metValue} />
      </td>
      <td>
        {noteIsTextarea ? (
          <textarea name={noteName} defaultValue={noteValue} rows={2} className="w-full" />
        ) : (
          <input
            name={noteName}
            defaultValue={noteValue}
            placeholder={notePlaceholder}
            className="w-full"
          />
        )}
      </td>
    </tr>
  );
}
