/** Per-ticker NOW poll interval selection. NULL / none = off. */
export type NowPollIntervalSelection = "none" | "1" | "5" | "10" | "30" | "1h";

export const NOW_POLL_INTERVAL_OPTIONS: {
  value: NowPollIntervalSelection;
  label: string;
}[] = [
  { value: "none", label: "No" },
  { value: "1", label: "1 min" },
  { value: "5", label: "5 min" },
  { value: "10", label: "10 min" },
  { value: "30", label: "30 min" },
  { value: "1h", label: "1 h" },
];

export type NowPollingSession = {
  active: boolean;
  anchorAt: string | null;
  lastSchedulerTickAt: string | null;
};

export const DEFAULT_NOW_POLLING_SESSION: NowPollingSession = {
  active: false,
  anchorAt: null,
  lastSchedulerTickAt: null,
};

const VALID_INTERVALS = new Set<NowPollIntervalSelection>(["none", "1", "5", "10", "30", "1h"]);

export function normalizeNowPollInterval(
  value: string | null | undefined
): NowPollIntervalSelection {
  if (value == null || value === "" || value === "none" || value === "0") return "none";
  const text = String(value).trim().toLowerCase();
  if (text === "60" || text === "1h") return "1h";
  if (VALID_INTERVALS.has(text as NowPollIntervalSelection)) {
    return text as NowPollIntervalSelection;
  }
  return "none";
}

export function nowPollIntervalMinutes(value: NowPollIntervalSelection): number {
  switch (value) {
    case "1":
      return 1;
    case "5":
      return 5;
    case "10":
      return 10;
    case "30":
      return 30;
    case "1h":
      return 60;
    default:
      return 0;
  }
}

export function nowPollIntervalFromDb(
  value: string | null | undefined
): NowPollIntervalSelection {
  if (value == null) return "none";
  switch (value) {
    case "M1":
    case "1":
      return "1";
    case "M5":
    case "5":
      return "5";
    case "M10":
    case "10":
      return "10";
    case "M30":
    case "30":
      return "30";
    case "H1":
    case "1h":
    case "60":
      return "1h";
    default:
      return normalizeNowPollInterval(value);
  }
}

export function nowPollIntervalToDb(
  value: NowPollIntervalSelection
): "M1" | "M5" | "M10" | "M30" | "H1" | null {
  switch (value) {
    case "1":
      return "M1";
    case "5":
      return "M5";
    case "10":
      return "M10";
    case "30":
      return "M30";
    case "1h":
      return "H1";
    default:
      return null;
  }
}

/** True when interval elapsed since last poll (or since anchor if never polled). */
export function isNowPollDue(
  interval: NowPollIntervalSelection,
  lastPollAt: string | Date | null | undefined,
  anchorAt: string | null | undefined,
  now = new Date()
): boolean {
  const intervalMin = nowPollIntervalMinutes(interval);
  if (intervalMin <= 0) return false;
  const nowMs = now.getTime();
  const lastMs = lastPollAt ? new Date(lastPollAt).getTime() : null;
  const anchorMs = anchorAt ? new Date(anchorAt).getTime() : null;
  const baseMs = lastMs ?? anchorMs;
  if (baseMs == null) return true;
  return nowMs - baseMs >= intervalMin * 60_000;
}

export function mergeNowPollingSession(
  existing?: NowPollingSession | null
): NowPollingSession {
  return {
    ...DEFAULT_NOW_POLLING_SESSION,
    ...(existing ?? {}),
  };
}

export function nowPollingStatusLabel(session: NowPollingSession | null | undefined): string {
  if (!session?.active) return "Polling parado";
  return "Polling activo";
}

/** @deprecated Use NowPollIntervalSelection */
export type NowPollIntervalMinutes = 0 | 1 | 5 | 10 | 30 | 60;
