const ET = "America/New_York";

type EtParts = {
  weekday: string;
  hour: number;
  minute: number;
};

function etParts(now = new Date()): EtParts {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: ET,
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });
  const parts = fmt.formatToParts(now);
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "";
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return { weekday, hour, minute };
}

function isWeekday(weekday: string): boolean {
  return !["Sat", "Sun"].includes(weekday);
}

/** US regular session: Mon–Fri 9:30 AM – 4:00 PM Eastern. */
export function isRegularSessionOpenEt(now = new Date()): boolean {
  const { weekday, hour, minute } = etParts(now);
  if (!isWeekday(weekday)) return false;
  const minutes = hour * 60 + minute;
  return minutes >= 9 * 60 + 30 && minutes < 16 * 60;
}

export function tradingDateEt(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ET,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Mon–Fri session calendar day (holidays not excluded). */
export function isTradingSessionDayEt(now = new Date()): boolean {
  return isWeekday(etParts(now).weekday);
}

/** Last US equity session date on or before now (Sat/Sun → prior Friday). */
export function effectiveTradingDateEt(now = new Date()): string {
  const cursor = new Date(now.getTime());
  for (let i = 0; i < 7; i += 1) {
    if (isTradingSessionDayEt(cursor)) {
      return tradingDateEt(cursor);
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  return tradingDateEt(now);
}

/** True when AWS flow tradeDate matches session (Fri on weekends) or calendar ET day. */
export function isFlowTradeDateActive(
  flowTradeDate: string | undefined | null,
  now = new Date()
): boolean {
  if (!flowTradeDate) return false;
  const session = effectiveTradingDateEt(now);
  if (flowTradeDate === session) return true;
  return flowTradeDate === tradingDateEt(now);
}

export const WATCH_POLL_FAST_MS = 60 * 1000;
export const WATCH_POLL_SLOW_MS = 15 * 60 * 1000;
export const WATCH_POLL_FAST_WINDOW_MIN = 10;

/** Minutes since 9:30 ET regular open, or null if outside session. */
export function sessionMinutesSinceOpenEt(now = new Date()): number | null {
  const { weekday, hour, minute } = etParts(now);
  if (!isWeekday(weekday)) return null;
  const minutes = hour * 60 + minute;
  const open = 9 * 60 + 30;
  if (minutes < open || minutes >= 16 * 60) return null;
  return minutes - open;
}

export const SESSION_POLL_END_MIN = 15 * 60;

export function isNowPollingWindowEt(now = new Date()): boolean {
  const { weekday, hour, minute } = etParts(now);
  if (!isWeekday(weekday)) return false;
  const minutes = hour * 60 + minute;
  return minutes >= 9 * 60 + 30 && minutes <= SESSION_POLL_END_MIN;
}

export const MANUAL_NOW_POLL_MS = 15 * 60 * 1000;

/** @deprecated Use per-ticker intervals in Market Result Now. */
export function manualNowPollIntervalMs(): number {
  return MANUAL_NOW_POLL_MS;
}

export function liveSessionHint(): string {
  return "NOW por ticker en Market — intervalos 1 / 5 / 10 / 30 / 1 h o intake manual.";
}

export function nowPollHint(): string {
  return liveSessionHint();
}

/** @deprecated use nowPollHint */
export function watchPollHint(): string {
  return nowPollHint();
}

export const STRATEGY_MET_AVAILABLE_FROM_MIN = 9 * 60 + 30;

/** Minutes since midnight ET (weekday session helper). */
export function minutesOfDayEt(now = new Date()): number {
  const { hour, minute } = etParts(now);
  return hour * 60 + minute;
}

/** BB15 movement UI poll window: Mon–Fri 9:30–10:15 AM ET. */
export const BB15_FAST_START_MIN = 9 * 60 + 30;
export const BB15_FAST_END_MIN = 9 * 60 + 40;
/** Live UI poll through 10:15 ET (covers 10:00 validation tick). */
export const BB15_RESULTS_POLL_END_MIN = 10 * 60 + 15;

export function isBolinger15FastWindowEt(now = new Date()): boolean {
  const { weekday } = etParts(now);
  if (!isWeekday(weekday)) return false;
  const minutes = minutesOfDayEt(now);
  return minutes >= BB15_FAST_START_MIN && minutes <= BB15_FAST_END_MIN;
}

/** Poll BB15 status while scheduled session + 10:00 validation may still update. */
export function isBolinger15FastResultsPollEt(now = new Date()): boolean {
  const { weekday } = etParts(now);
  if (!isWeekday(weekday)) return false;
  const minutes = minutesOfDayEt(now);
  return minutes >= BB15_FAST_START_MIN && minutes <= BB15_RESULTS_POLL_END_MIN;
}

/** Strategy met API active from 9:30 ET when polling starts. */
export function isStrategyMetApiAvailableEt(now = new Date()): boolean {
  const { weekday } = etParts(now);
  if (!isWeekday(weekday)) return false;
  return minutesOfDayEt(now) >= STRATEGY_MET_AVAILABLE_FROM_MIN;
}

/** After NOW poll window (15:00 ET) or weekend — auto Stop watch. */
export function shouldAutoStopWatchEt(now = new Date()): boolean {
  const { weekday, hour, minute } = etParts(now);
  if (!isWeekday(weekday)) return true;
  return hour * 60 + minute > SESSION_POLL_END_MIN;
}

/** Journey snapshot: POST row after regular close, or any time on weekend (last session). */
export function shouldFetchPostmarketForJourneyEt(now = new Date()): boolean {
  const { weekday, hour, minute } = etParts(now);
  if (!isWeekday(weekday)) return true;
  return hour * 60 + minute >= 16 * 60;
}
