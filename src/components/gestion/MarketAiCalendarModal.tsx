"use client";

import type { FinanceAiFomcMeeting, FinanceAiMonthCalendar } from "@/lib/finance-ai-types";
import { formatFinanceAiTimestamp } from "@/lib/format-datetime";

type EarningsRow = { symbol?: string; date?: string; hour?: string };

type Props = {
  open: boolean;
  onClose: () => void;
  monthCal: FinanceAiMonthCalendar | null;
  fomcMeetings: FinanceAiFomcMeeting[];
  earningsRows: EarningsRow[];
  lastUpdate?: string;
  fomcWarning?: string | null;
};

export function MarketAiCalendarModal({
  open,
  onClose,
  monthCal,
  fomcMeetings,
  earningsRows,
  lastUpdate,
  fomcWarning,
}: Props) {
  if (!open) return null;

  const monthLabel = monthCal?.month ?? "Este mes";
  const fomcThisMonth = monthCal?.fomcDates ?? [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="calendar-modal-title"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[85vh] overflow-y-auto border border-investep-navy/20"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-4 py-3 border-b">
          <div>
            <h3 id="calendar-modal-title" className="font-semibold text-investep-navy">
              Calendario FOMC guardado · {monthLabel}
            </h3>
            {lastUpdate && (
              <p className="text-xs text-gray-600 mt-0.5">
                Last update: {formatFinanceAiTimestamp(lastUpdate)}
              </p>
            )}
          </div>
          <button
            type="button"
            className="text-gray-500 hover:text-investep-navy text-lg leading-none px-1"
            onClick={onClose}
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        <div className="px-4 py-3 space-y-4 text-sm">
          {fomcWarning && (
            <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded p-2">
              {fomcWarning}
            </p>
          )}

          <section>
            <h4 className="font-medium text-investep-navy mb-1">FOMC · {monthLabel}</h4>
            {fomcThisMonth.length > 0 ? (
              <ul className="space-y-1 text-xs">
                {fomcThisMonth.map((f) => (
                  <li key={f.date}>
                    {f.date}
                    {f.sep ? " · SEP" : ""}
                    {f.event ? ` — ${f.event}` : ""}
                  </li>
                ))}
              </ul>
            ) : fomcMeetings.length > 0 ? (
              <ul className="space-y-1 text-xs">
                {fomcMeetings
                  .filter((m) => m.start?.startsWith(monthLabel.slice(0, 7)))
                  .map((m) => (
                    <li key={`${m.start}-${m.end}`}>
                      {m.start?.slice(5)}–{m.end?.slice(8)}{" "}
                      <span className={m.sep ? "text-amber-800 font-medium" : "text-gray-500"}>
                        {m.sep ? "SEP sí" : "SEP no"}
                      </span>
                    </li>
                  ))}
              </ul>
            ) : (
              <p className="text-xs text-gray-500">Sin fechas FOMC este mes.</p>
            )}
          </section>

          <section>
            <h4 className="font-medium text-investep-navy mb-1">
              Earnings favoritos · {monthLabel}
            </h4>
            {earningsRows.length > 0 ? (
              <ul className="space-y-1 text-xs">
                {earningsRows.map((e, i) => (
                  <li key={`${e.symbol}-${e.date}-${i}`}>
                    <span className="font-medium">{e.symbol ?? "?"}</span>
                    {" · "}
                    {e.date}
                    {e.hour ? ` (${e.hour})` : ""}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-gray-500">
                Sin earnings este mes — use Request Earning Calendar in Ticker Context or Config → Global Context.
              </p>
            )}
          </section>
        </div>

        <div className="px-4 py-3 border-t">
          <button
            type="button"
            className="text-sm bg-investep-navy text-white px-3 py-1.5 rounded"
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

export function buildEarningsRowsFromCalendar(
  monthCal: FinanceAiMonthCalendar | null,
  earningsBySymbol?: Record<string, { date?: string; hour?: string; symbol?: string }[]>
): EarningsRow[] {
  if (monthCal?.symbolEarnings?.length) {
    return [...monthCal.symbolEarnings].sort((a, b) =>
      (a.date ?? "").localeCompare(b.date ?? "")
    );
  }
  if (!earningsBySymbol) return [];
  const rows: EarningsRow[] = [];
  for (const [symbol, entries] of Object.entries(earningsBySymbol)) {
    if (!Array.isArray(entries)) continue;
    for (const e of entries) {
      if (!e || typeof e !== "object") continue;
      rows.push({ symbol, date: e.date, hour: e.hour });
    }
  }
  return rows.sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
}
