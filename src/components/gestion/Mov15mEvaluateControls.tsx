"use client";

import {
  clampSimulateUntilTime,
  SIMULATE_UNTIL_TIME_END,
  SIMULATE_UNTIL_TIME_START,
  simulateUntilTimeOptions,
  type Mov15mPollingParams,
} from "@/lib/mov15m-polling";

const SIMULATE_UNTIL_TIMES = simulateUntilTimeOptions();

type Props = {
  value: Mov15mPollingParams;
  onChange: (next: Mov15mPollingParams) => void;
  disabled?: boolean;
};

/** Simulate date/time for Evaluate — shown on panel (polling lives in modal). */
export function Mov15mEvaluateControls({ value, onChange, disabled = false }: Props) {
  return (
    <div className="flex flex-wrap gap-2 items-end mb-3 text-[11px]">
      <label className="flex flex-col gap-0.5">
        <span className="text-[10px] text-gray-600">simulateUntilDate</span>
        <input
          type="date"
          className="border border-gray-300 rounded px-2 py-1 text-xs bg-white disabled:opacity-50"
          disabled={disabled}
          value={value.simulateUntilDate}
          onChange={(e) =>
            onChange({
              ...value,
              simulateUntilDate: e.target.value,
            })
          }
        />
      </label>
      <label className="flex flex-col gap-0.5">
        <span className="text-[10px] text-gray-600">
          simulateUntilTime (ET · {SIMULATE_UNTIL_TIME_START}–{SIMULATE_UNTIL_TIME_END})
        </span>
        <select
          className="border border-gray-300 rounded px-2 py-1 text-xs bg-white disabled:opacity-50 min-w-[5.5rem]"
          disabled={disabled}
          value={
            value.simulateUntilTime && SIMULATE_UNTIL_TIMES.includes(value.simulateUntilTime)
              ? value.simulateUntilTime
              : ""
          }
          onChange={(e) =>
            onChange({
              ...value,
              simulateUntilTime: clampSimulateUntilTime(e.target.value),
            })
          }
        >
          <option value="">— omit</option>
          {SIMULATE_UNTIL_TIMES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
