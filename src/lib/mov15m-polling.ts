/** Mov15m 1m polling window — passed to POST /context/mov15m/status on Evaluate. */

import { effectiveTradingDateEt } from "@/lib/live-session-window";

export const MOV15M_DEFAULT_POLLING_START = "09:30";
export const MOV15M_DEFAULT_POLLING_END = "10:00";

/** simulateUntilTime — opening window only (ET). */
export const SIMULATE_UNTIL_TIME_START = "09:00";
export const SIMULATE_UNTIL_TIME_END = "10:00";
const SIMULATE_UNTIL_MINUTES_START = 9 * 60;
const SIMULATE_UNTIL_MINUTES_END = 10 * 60;

export function simulateUntilTimeOptions(): string[] {
  const out: string[] = [];
  for (let m = SIMULATE_UNTIL_MINUTES_START; m <= SIMULATE_UNTIL_MINUTES_END; m += 1) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    out.push(`${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`);
  }
  return out;
}

/** Keeps HH:mm inside 9:00–10:00 ET; empty stays empty. */
export function clampSimulateUntilTime(hhmm: string): string {
  const trimmed = hhmm.trim();
  if (!trimmed) return "";
  const minutes = parseTimeEtToMinutes(trimmed);
  if (minutes == null) return "";
  const clamped = Math.min(
    SIMULATE_UNTIL_MINUTES_END,
    Math.max(SIMULATE_UNTIL_MINUTES_START, minutes)
  );
  const h = Math.floor(clamped / 60);
  const min = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

export type Mov15mPollingParams = {
  tickersForPolling: string[];
  /** When true, POST includes poll1m + polling start/end ET window. */
  poll1mEnabled: boolean;
  pollingStartTimeEt: string;
  pollingEndTimeEt: string;
  simulateUntilDate: string;
  simulateUntilTime: string;
};

export function defaultMov15mPollingParams(
  symbols: string[],
  now = new Date()
): Mov15mPollingParams {
  return {
    tickersForPolling: [...symbols],
    poll1mEnabled: false,
    pollingStartTimeEt: MOV15M_DEFAULT_POLLING_START,
    pollingEndTimeEt: MOV15M_DEFAULT_POLLING_END,
    simulateUntilDate: effectiveTradingDateEt(now),
    simulateUntilTime: "",
  };
}

export function parseTickersForPollingInput(raw: string, fallback: string[]): string[] {
  const fromInput = raw
    .split(/[\s,;]+/)
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const sym of fromInput.length > 0 ? fromInput : fallback) {
    if (!seen.has(sym)) {
      seen.add(sym);
      out.push(sym);
    }
  }
  return out.sort((a, b) => a.localeCompare(b));
}

export function formatTickersForPollingInput(symbols: string[]): string {
  return symbols.join(", ");
}

/** Parse HH:mm (24h) to minutes from midnight ET. */
export function parseTimeEtToMinutes(hhmm: string): number | undefined {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return undefined;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return undefined;
  return hour * 60 + minute;
}

export type Mov15mPollingApiPayload = {
  poll1m?: boolean;
  symbols?: string[];
  pollingStartTimeEt?: string;
  pollingEndTimeEt?: string;
  simulateUntilDate?: string;
  simulateUntilTime?: string;
  tradeDate?: string;
  simulationTimeEt?: string;
  simulateMinutesEt?: number;
};

/** Normalize ticker list for POST /context/mov15m/status (symbols[] required on FinanceAI). */
export function normalizeMov15mSymbols(
  symbols?: string[] | null,
  fallback?: string[] | null
): string[] {
  const raw = (symbols?.length ? symbols : fallback) ?? [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    const sym = String(item ?? "")
      .trim()
      .toUpperCase();
    if (!sym || seen.has(sym)) continue;
    seen.add(sym);
    out.push(sym);
  }
  return out.sort((a, b) => a.localeCompare(b));
}

export function mov15mPollingToApiPayload(params: Mov15mPollingParams): Mov15mPollingApiPayload {
  const payload: Mov15mPollingApiPayload = {};

  const symbols = normalizeMov15mSymbols(params.tickersForPolling);
  if (symbols.length > 0) {
    payload.symbols = symbols;
  }

  const simulateDate = params.simulateUntilDate?.trim();
  if (simulateDate) {
    payload.simulateUntilDate = simulateDate;
    payload.tradeDate = simulateDate;
  }

  const simulateTime = clampSimulateUntilTime(params.simulateUntilTime ?? "");
  if (simulateTime) {
    payload.simulateUntilTime = simulateTime;
    payload.simulationTimeEt = simulateTime;
    const minutes = parseTimeEtToMinutes(simulateTime);
    if (minutes != null) payload.simulateMinutesEt = minutes;
  }

  if (params.poll1mEnabled) {
    payload.poll1m = true;
    payload.pollingStartTimeEt = params.pollingStartTimeEt;
    payload.pollingEndTimeEt = params.pollingEndTimeEt;
  }

  return payload;
}
