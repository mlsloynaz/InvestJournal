"use client";

import { formatFinanceAiTimestamp } from "@/lib/format-datetime";
import {
  NOW_POLL_INTERVAL_OPTIONS,
  type NowPollIntervalSelection,
} from "@/lib/now-polling-session";

export type NowPollIntervalRow = {
  symbol: string;
  name: string | null;
  pollInterval: NowPollIntervalSelection;
  status?: string | null;
  lastPollAt?: string | null;
  awsScheduled?: boolean;
};

export function NowPollIntervalRadios({
  symbol,
  value,
  disabled,
  compact,
  onChange,
}: {
  symbol: string;
  value: NowPollIntervalSelection;
  disabled?: boolean;
  compact?: boolean;
  onChange: (symbol: string, interval: NowPollIntervalSelection) => void;
}) {
  return (
    <div
      className={
        compact
          ? "flex flex-wrap items-center gap-x-2 gap-y-0"
          : "grid grid-cols-2 sm:grid-cols-3 lg:flex lg:flex-wrap gap-x-3 gap-y-1.5"
      }
      role="radiogroup"
      aria-label={`Intervalo NOW ${symbol}`}
    >
      {NOW_POLL_INTERVAL_OPTIONS.map((opt) => (
        <label
          key={opt.value}
          className={`inline-flex items-center gap-0.5 ${
            compact ? "text-[10px]" : "text-xs"
          } ${disabled ? "opacity-50" : "cursor-pointer"}`}
        >
          <input
            type="radio"
            name={`now-poll-${symbol}`}
            value={opt.value}
            checked={value === opt.value}
            disabled={disabled}
            className={compact ? "h-3 w-3" : undefined}
            onChange={() => onChange(symbol, opt.value)}
          />
          {opt.label}
        </label>
      ))}
    </div>
  );
}

type TableProps = {
  rows: NowPollIntervalRow[];
  draft: Record<string, NowPollIntervalSelection>;
  disabled?: boolean;
  showAwsStatus?: boolean;
  stoppingSymbol?: string | null;
  onDraftChange: (symbol: string, interval: NowPollIntervalSelection) => void;
  onStopTicker?: (symbol: string) => void;
};

export function NowPollIntervalTable({
  rows,
  draft,
  disabled,
  showAwsStatus,
  stoppingSymbol,
  onDraftChange,
  onStopTicker,
}: TableProps) {
  const visible = rows;

  if (visible.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        Sin tickers ★ favoritos — marca favoritos en Config → Tickers.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto border border-gray-100 rounded-lg">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-gray-500 border-b bg-slate-50/80">
            <th className="py-2 px-3 font-medium">Ticker</th>
            <th className="py-2 px-3 font-medium">Estado</th>
            <th className="py-2 px-3 font-medium">Intervalo NOW</th>
            {showAwsStatus ? <th className="py-2 px-3 font-medium">AWS</th> : null}
            <th className="py-2 px-3 font-medium">Último poll</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((row) => {
            const interval = draft[row.symbol] ?? row.pollInterval;
            const scheduled = row.awsScheduled === true;
            return (
              <tr key={row.symbol} className="border-b border-gray-100 last:border-b-0">
                <td className="py-2.5 px-3 font-mono font-medium text-investep-navy">{row.symbol}</td>
                <td className="py-2.5 px-3 text-xs text-gray-600">
                  {row.status === "ready"
                    ? "Listo"
                    : row.status === "initializing"
                      ? "Init…"
                      : row.status === "error"
                        ? "Error init"
                        : row.status ?? "Sin init"}
                </td>
                <td className="py-2.5 px-3">
                  <NowPollIntervalRadios
                    symbol={row.symbol}
                    value={interval}
                    disabled={disabled}
                    onChange={onDraftChange}
                  />
                </td>
                {showAwsStatus ? (
                  <td className="py-2.5 px-3">
                    {scheduled ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium text-green-700">Scheduled</span>
                        {onStopTicker ? (
                          <button
                            type="button"
                            disabled={disabled || stoppingSymbol === row.symbol}
                            className="text-xs px-2 py-0.5 rounded border border-red-300 text-red-800 bg-red-50 hover:bg-red-100 disabled:opacity-50"
                            onClick={() => onStopTicker(row.symbol)}
                          >
                            {stoppingSymbol === row.symbol ? "…" : "Stop"}
                          </button>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                ) : null}
                <td className="py-2.5 px-3 text-xs text-gray-500 tabular-nums">
                  {row.lastPollAt ? formatFinanceAiTimestamp(row.lastPollAt) : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
