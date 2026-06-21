/** Mov15m 1m polling window — passed to POST /context/mov15m/status on Evaluate. */

export const MOV15M_DEFAULT_POLLING_START = "09:30";
export const MOV15M_DEFAULT_POLLING_END = "10:00";

export type Mov15mPollingParams = {
  tickersForPolling: string[];
  pollingStartTimeEt: string;
  pollingEndTimeEt: string;
};

export function defaultMov15mPollingParams(symbols: string[]): Mov15mPollingParams {
  return {
    tickersForPolling: [...symbols],
    pollingStartTimeEt: MOV15M_DEFAULT_POLLING_START,
    pollingEndTimeEt: MOV15M_DEFAULT_POLLING_END,
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

export function mov15mPollingToApiPayload(params: Mov15mPollingParams): {
  poll1m: true;
  symbols: string[];
  tickersForPolling: string[];
  pollingStartTimeEt: string;
  pollingEndTimeEt: string;
} {
  return {
    poll1m: true,
    symbols: params.tickersForPolling,
    tickersForPolling: params.tickersForPolling,
    pollingStartTimeEt: params.pollingStartTimeEt,
    pollingEndTimeEt: params.pollingEndTimeEt,
  };
}
