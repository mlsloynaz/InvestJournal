"use client";

import {
  formatTickersForPollingInput,
  MOV15M_DEFAULT_POLLING_END,
  MOV15M_DEFAULT_POLLING_START,
  type Mov15mPollingParams,
  parseTickersForPollingInput,
} from "@/lib/mov15m-polling";

type Props = {
  configSymbols: string[];
  value: Mov15mPollingParams;
  onChange: (next: Mov15mPollingParams) => void;
  disabled?: boolean;
};

export function Mov15mPollingControls({
  configSymbols,
  value,
  onChange,
  disabled = false,
}: Props) {
  return (
    <div className="rounded border border-violet-200 bg-violet-50/40 px-3 py-2 text-[11px] space-y-2">
      <p className="font-semibold text-violet-950">1m polling (Evaluate)</p>
      <div className="flex flex-wrap gap-2 items-end">
        <label className="flex flex-col gap-0.5 min-w-[12rem] flex-1">
          <span className="text-[10px] text-gray-600">Tickers for polling</span>
          <input
            type="text"
            className="border border-gray-300 rounded px-2 py-1 text-xs font-mono bg-white disabled:opacity-50"
            disabled={disabled}
            value={formatTickersForPollingInput(value.tickersForPolling)}
            placeholder={configSymbols.join(", ") || "AAPL, MSFT"}
            onChange={(e) =>
              onChange({
                ...value,
                tickersForPolling: parseTickersForPollingInput(e.target.value, configSymbols),
              })
            }
          />
        </label>
        <label className="flex flex-col gap-0.5">
          <span className="text-[10px] text-gray-600">Start ET</span>
          <input
            type="time"
            className="border border-gray-300 rounded px-2 py-1 text-xs bg-white disabled:opacity-50"
            disabled={disabled}
            value={value.pollingStartTimeEt}
            onChange={(e) =>
              onChange({
                ...value,
                pollingStartTimeEt: e.target.value || MOV15M_DEFAULT_POLLING_START,
              })
            }
          />
        </label>
        <label className="flex flex-col gap-0.5">
          <span className="text-[10px] text-gray-600">End ET</span>
          <input
            type="time"
            className="border border-gray-300 rounded px-2 py-1 text-xs bg-white disabled:opacity-50"
            disabled={disabled}
            value={value.pollingEndTimeEt}
            onChange={(e) =>
              onChange({
                ...value,
                pollingEndTimeEt: e.target.value || MOV15M_DEFAULT_POLLING_END,
              })
            }
          />
        </label>
      </div>
      <p className="text-[10px] text-gray-600">
        Default {MOV15M_DEFAULT_POLLING_START}–{MOV15M_DEFAULT_POLLING_END} ET · polls 1m bars · results
        sorted by probability
      </p>
    </div>
  );
}
