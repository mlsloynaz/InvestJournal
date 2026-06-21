"use client";

import { useState } from "react";
import {
  formatTickersForPollingInput,
  MOV15M_DEFAULT_POLLING_END,
  MOV15M_DEFAULT_POLLING_START,
  mov15mPollingToApiPayload,
  type Mov15mPollingParams,
} from "@/lib/mov15m-polling";
import { resolveMov15mPollingRuntimeStatus } from "@/lib/mov15m-polling-status";
import {
  checkFinanceAiMov15mPollingStatus,
  startFinanceAiMov15mPolling,
  stopFinanceAiMov15mPolling,
} from "@/server/actions/finance-ai";

type Props = {
  open: boolean;
  onClose: () => void;
  configSymbols: string[];
  value: Mov15mPollingParams;
  onChange: (next: Mov15mPollingParams) => void;
  variant?: "inside" | "outside";
};

const HEADER_CLASS = {
  inside: "text-violet-950 border-violet-200",
  outside: "text-amber-950 border-amber-200",
} as const;

export function Mov15mPollingConfigModal({
  open,
  onClose,
  configSymbols,
  value,
  onChange,
  variant = "inside",
}: Props) {
  const [busy, setBusy] = useState<"check" | "start" | "stop" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [runtimeLabel, setRuntimeLabel] = useState<string | null>(null);
  const [runtimeRunning, setRuntimeRunning] = useState(false);
  const [lastRunAt, setLastRunAt] = useState<string | null>(null);

  if (!open) return null;

  const tickersDisplay = formatTickersForPollingInput(
    value.tickersForPolling.length > 0 ? value.tickersForPolling : configSymbols
  );
  const disabled = busy !== null;

  async function onCheckStatus() {
    setBusy("check");
    setMessage(null);
    const result = await checkFinanceAiMov15mPollingStatus();
    if (!result.success || !result.status) {
      setRuntimeLabel(result.error ?? "Error consultando status");
      setRuntimeRunning(false);
    } else {
      const runtime = resolveMov15mPollingRuntimeStatus(result.status);
      setRuntimeLabel(runtime.label);
      setRuntimeRunning(runtime.running);
      setLastRunAt(runtime.lastRunAt ?? null);
    }
    setBusy(null);
  }

  async function onStartPolling() {
    setBusy("start");
    setMessage(null);
    const tickers =
      value.tickersForPolling.length > 0 ? value.tickersForPolling : configSymbols;
    const payload = mov15mPollingToApiPayload({
      ...value,
      tickersForPolling: tickers,
      poll1mEnabled: true,
    });
    const result = await startFinanceAiMov15mPolling({
      symbols: payload.symbols,
      tickersForPolling: payload.tickersForPolling,
      pollingStartTimeEt: payload.pollingStartTimeEt,
      pollingEndTimeEt: payload.pollingEndTimeEt,
      simulateUntilDate: payload.simulateUntilDate,
      simulateUntilTime: payload.simulateUntilTime,
      simulationTimeEt: payload.simulationTimeEt,
      tradeDate: payload.tradeDate,
      simulateMinutesEt: payload.simulateMinutesEt,
    });
    if (!result.success) {
      setMessage(result.error ?? "Error iniciando polling");
      setBusy(null);
      return;
    }
    setMessage(result.message ?? "Polling iniciado");
    onChange({ ...value, poll1mEnabled: true });
    const check = await checkFinanceAiMov15mPollingStatus();
    if (check.success && check.status) {
      const runtime = resolveMov15mPollingRuntimeStatus(check.status);
      setRuntimeLabel(runtime.label);
      setRuntimeRunning(runtime.running);
      setLastRunAt(runtime.lastRunAt ?? null);
    }
    setBusy(null);
  }

  async function onStopPolling() {
    setBusy("stop");
    setMessage(null);
    const result = await stopFinanceAiMov15mPolling();
    if (!result.success) {
      setMessage(result.error ?? "Error deteniendo polling");
    } else {
      setMessage(result.message ?? "Polling detenido");
      onChange({ ...value, poll1mEnabled: false });
      setRuntimeRunning(false);
      setRuntimeLabel("Polling detenido");
    }
    setBusy(null);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mov15m-polling-modal-title"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-md w-full border border-gray-200 text-[11px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`flex items-start justify-between gap-3 px-4 py-3 border-b ${HEADER_CLASS[variant]}`}
        >
          <div>
            <h3 id="mov15m-polling-modal-title" className="font-semibold text-sm">
              Polling configuration · 1m
            </h3>
            <p className="text-[10px] text-gray-600 mt-0.5">
              Start / stop 1m bar polling en AWS (mov15m)
            </p>
          </div>
          <button
            type="button"
            className="text-gray-500 hover:text-gray-800 text-lg leading-none px-1"
            onClick={onClose}
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        <div className="px-4 py-3 space-y-3">
          <div
            className={`rounded border px-3 py-2 ${
              runtimeRunning
                ? "border-sky-300 bg-sky-50 text-sky-950"
                : "border-gray-200 bg-gray-50 text-gray-700"
            }`}
          >
            <p className="font-medium text-[10px]">
              Status: {runtimeRunning ? "Running" : "Stopped"}
            </p>
            <p className="text-[10px] mt-0.5">{runtimeLabel ?? "Pulsa Check polling status"}</p>
            {lastRunAt ? (
              <p className="text-[9px] text-gray-500 mt-0.5">lastRunAt {lastRunAt}</p>
            ) : null}
          </div>

          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              className="rounded border-gray-300"
              disabled={disabled}
              checked={value.poll1mEnabled}
              onChange={(e) =>
                onChange({
                  ...value,
                  poll1mEnabled: e.target.checked,
                })
              }
            />
            <span className="text-[10px] font-medium">Enable 1m polling</span>
          </label>

          <label className="flex flex-col gap-0.5">
            <span className="text-[10px] text-gray-600">Tickers</span>
            <input
              type="text"
              readOnly
              className="border border-gray-200 rounded px-2 py-1 text-xs font-mono bg-gray-50 text-gray-700 w-[8.5rem] truncate cursor-default"
              value={tickersDisplay}
              title={tickersDisplay}
            />
          </label>

          {value.poll1mEnabled ? (
          <div className="flex flex-wrap gap-2 items-end">
            <label className="flex flex-col gap-0.5">
              <span className="text-[10px] text-gray-600">Poll start ET</span>
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
              <span className="text-[10px] text-gray-600">Poll end ET</span>
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
          ) : (
            <p className="text-[10px] text-gray-500">
              Marca Enable 1m polling para configurar ventana start/end ET.
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="text-[10px] px-2 py-1 rounded border border-gray-400 text-gray-800 bg-white disabled:opacity-50"
              disabled={disabled}
              onClick={() => void onCheckStatus()}
            >
              {busy === "check" ? "Checking…" : "Check polling status"}
            </button>
            <button
              type="button"
              className="text-[10px] px-2 py-1 rounded border border-sky-600 text-sky-800 bg-sky-50 disabled:opacity-50"
              disabled={disabled || configSymbols.length === 0 || !value.poll1mEnabled}
              onClick={() => void onStartPolling()}
            >
              {busy === "start" ? "Starting…" : "Start 1m polling"}
            </button>
            <button
              type="button"
              className="text-[10px] px-2 py-1 rounded border border-rose-500 text-rose-800 bg-rose-50 disabled:opacity-50"
              disabled={disabled || !value.poll1mEnabled}
              onClick={() => void onStopPolling()}
            >
              {busy === "stop" ? "Stopping…" : "Stop polling"}
            </button>
          </div>

          {message ? (
            <p className="text-[10px] text-gray-700 bg-gray-50 border border-gray-200 rounded px-2 py-1">
              {message}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
