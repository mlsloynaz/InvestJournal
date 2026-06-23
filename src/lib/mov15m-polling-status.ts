import type { FinanceAiBolinger15FastMovementStatus } from "@/lib/finance-ai-types";

export type Mov15mPollingRuntimeStatus = {
  running: boolean;
  label: string;
  phase?: string;
  pollIntervalSec?: number;
  lastRunAt?: string;
  tradeDate?: string;
  openingPollEndEt?: string;
  windowActive?: boolean;
};

export function resolveMov15mPollingRuntimeStatus(
  status: FinanceAiBolinger15FastMovementStatus | null | undefined
): Mov15mPollingRuntimeStatus {
  if (!status) {
    return { running: false, label: "Sin status — pulsa Check polling status" };
  }

  const phase = status.currentPhase ?? status.phase ?? status.lastRunPhase ?? "";
  const poll1mActive =
    (status as { poll1mActive?: boolean }).poll1mActive === true ||
    (status as { poll1mRunning?: boolean }).poll1mRunning === true;

  const phasePoll =
    phase === "opening_poll" ||
    phase === "opening_min1" ||
    phase === "1m_poll" ||
    phase === "poll1m";

  // pollIntervalSec on status API is configured interval metadata, not "polling is running".
  const running = poll1mActive || phasePoll;

  if (running) {
    const window =
      status.sessionStartEt && status.openingPollEndEt
        ? `${status.sessionStartEt}–${status.openingPollEndEt} ET`
        : status.openingPollEndEt
          ? `hasta ${status.openingPollEndEt} ET`
          : undefined;
    return {
      running: true,
      label: window
        ? `1m polling activo · ${phase || "poll"} · ${window}`
        : `1m polling activo · ${phase || "poll"}`,
      phase,
      pollIntervalSec: status.pollIntervalSec,
      lastRunAt: status.lastRunAt,
      tradeDate: status.tradeDate ?? status.effectiveTradeDate,
      openingPollEndEt: status.openingPollEndEt,
      windowActive: status.windowActive,
    };
  }

  if (status.sessionComplete) {
    return {
      running: false,
      label: "Sesión completa — polling no activo",
      phase,
      lastRunAt: status.lastRunAt,
      tradeDate: status.tradeDate ?? status.effectiveTradeDate,
      windowActive: status.windowActive,
    };
  }

  return {
    running: false,
    label: phase ? `Polling detenido · última fase ${phase}` : "Polling detenido",
    phase,
    lastRunAt: status.lastRunAt,
    tradeDate: status.tradeDate ?? status.effectiveTradeDate,
    windowActive: status.windowActive,
  };
}
