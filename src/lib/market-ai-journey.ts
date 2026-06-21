import type {
  FinanceAiNowPollingStatus,
  FinanceAiPostmarketAnalysis,
  FinanceAiPostmarketStats,
  FinanceAiPremarketAnalysis,
  FinanceAiTickersNow,
} from "@/lib/finance-ai-types";
import type { NowPollingSession } from "@/lib/now-polling-session";
import { nowPollingStatusLabel } from "@/lib/now-polling-session";
import {
  effectiveTradingDateEt,
  shouldAutoStopWatchEt,
  tradingDateEt,
} from "@/lib/live-session-window";

export type JourneyStepId =
  | "now-status"
  | "view-result-now"
  | "post-status"
  | "view-result-post";

export type JourneyProcessKey = "now" | "post";

export type JourneyProcessMode = "on" | "off";

export type JourneyProcessControl = Record<JourneyProcessKey, JourneyProcessMode>;

export const JOURNEY_STATUS_STEP_IDS: JourneyStepId[] = ["now-status", "post-status"];

export type JourneyStepKind = "status" | "view";

export type JourneyStepVisual = "pending" | "working" | "done" | "view";

export type JourneyStepDef = {
  id: JourneyStepId;
  kind: JourneyStepKind;
  label: string;
  shortLabel: string;
  hint: string;
  anchor: string;
  panelKey?: "now" | "post";
};

export const MARKET_AI_JOURNEY_STEPS: JourneyStepDef[] = [
  {
    id: "now-status",
    kind: "status",
    label: "NOW",
    shortLabel: "NOW",
    hint: "Market → Result Now · POST /tickers/check (barras + checklist sync).",
    anchor: "journey-result-now",
    panelKey: "now",
  },
  {
    id: "view-result-now",
    kind: "view",
    label: "Ver Result NOW",
    shortLabel: "Ver NOW",
    hint: "Abrir panel Result Now en Market",
    anchor: "journey-result-now",
    panelKey: "now",
  },
  {
    id: "post-status",
    kind: "status",
    label: "Post Market",
    shortLabel: "Post",
    hint: "Iniciar = POST manual on-demand. Schedule AWS ~5 PM ET sigue activo si está habilitado.",
    anchor: "journey-result-post",
  },
  {
    id: "view-result-post",
    kind: "view",
    label: "Ver Result Post",
    shortLabel: "Ver Post",
    hint: "Abrir panel Result Postmarket",
    anchor: "journey-result-post",
    panelKey: "post",
  },
];

export type JourneyTickerLocal = {
  symbol: string;
  status?: string | null;
  premarketAt?: string | null;
  premarketDate?: string | null;
  premarketMode?: string | null;
  liveEligible?: boolean;
};

export type JourneyAwsSnapshot = {
  checkedAt: string;
  tradeDate: string;
  nowPolling?: FinanceAiNowPollingStatus | null;
  tickersNow?: FinanceAiTickersNow | null;
  postmarketStats?: FinanceAiPostmarketStats | null;
  premarketBySymbol: Record<string, FinanceAiPremarketAnalysis | null | undefined>;
  postmarketBySymbol: Record<string, FinanceAiPostmarketAnalysis | null | undefined>;
};

export type JourneyStepStatus = {
  visual: JourneyStepVisual;
  detail: string;
  lastRunAt?: string | null;
};

function isPremarketToday(
  date: string | null | undefined,
  at: string | null | undefined,
  today: string
): boolean {
  if (date?.trim() === today) return true;
  if (at) return tradingDateEt(new Date(at)) === today;
  return false;
}

function awsPremarketReadyToday(
  analysis: FinanceAiPremarketAnalysis | null | undefined,
  today: string
): boolean {
  if (!analysis || analysis.status === "running") return false;
  if (analysis.date && analysis.date !== today) return false;
  return analysis.status === "ready" || Boolean(analysis.strategyChecklist);
}

/** Morning PRE row suitable for MySQL summary — not a live NOW refresh. */
export function isPremarketBaselineReadyToPersist(
  analysis: FinanceAiPremarketAnalysis | null | undefined,
  today: string
): boolean {
  if (!awsPremarketReadyToday(analysis, today)) return false;
  if (analysis!.status === "error") return false;
  const mode = (analysis!.mode ?? "").toLowerCase();
  const phase = (analysis!.assessmentPhase ?? "").toUpperCase();
  if (mode === "now" || phase === "NOW") return false;
  return true;
}

export function lookupJourneyPremarket(
  premarketBySymbol: Record<string, FinanceAiPremarketAnalysis | null | undefined>,
  symbol: string
): FinanceAiPremarketAnalysis | null | undefined {
  const upper = symbol.toUpperCase();
  return premarketBySymbol[upper] ?? premarketBySymbol[symbol];
}

/** Ready ticker with PRE today — MySQL stamp and/or AWS PremarketAnalysis row. */
export function tickerEligibleForNow(
  local: JourneyTickerLocal,
  awsPremarket: FinanceAiPremarketAnalysis | null | undefined,
  today: string
): boolean {
  if (local.status !== "ready") return false;
  if (isPremarketToday(local.premarketDate, local.premarketAt, today)) return true;
  return awsPremarketReadyToday(awsPremarket, today);
}

function awsPremarketRunning(
  analysis: FinanceAiPremarketAnalysis | null | undefined,
  today: string
): boolean {
  if (!analysis) return false;
  if (analysis.date && analysis.date !== today) return false;
  return analysis.status === "running";
}

function hasNowEvalToday(
  analysis: FinanceAiPremarketAnalysis | null | undefined,
  today: string
): boolean {
  if (!analysis || analysis.date !== today) return false;
  return (
    analysis.assessmentPhase === "NOW" ||
    Boolean(analysis.nowUpdatedAt) ||
    analysis.mode === "now"
  );
}

function awsPostmarketRunning(
  analysis: FinanceAiPostmarketAnalysis | null | undefined,
  today: string
): boolean {
  if (!analysis) return false;
  if (analysis.date && analysis.date !== today) return false;
  return analysis.status === "running";
}

function awsPostmarketReadyToday(
  analysis: FinanceAiPostmarketAnalysis | null | undefined,
  today: string
): boolean {
  if (!analysis || analysis.status === "running") return false;
  if (analysis.date && analysis.date !== today) return false;
  return (
    analysis.status === "ready" ||
    Boolean(analysis.report?.summary) ||
    Boolean(analysis.outcomes)
  );
}

function latestTimestamp(values: Array<string | null | undefined>): string | null {
  let best: string | null = null;
  for (const value of values) {
    if (!value) continue;
    if (!best || new Date(value).getTime() > new Date(best).getTime()) {
      best = value;
    }
  }
  return best;
}

function isManualNowActive(nowPolling: FinanceAiNowPollingStatus | null | undefined): boolean {
  if ((nowPolling?.manualEnrolled?.length ?? 0) > 0) return true;
  if (nowPolling?.tickers) {
    return Object.values(nowPolling.tickers).some((row) => row.manualNow);
  }
  return false;
}

export function buildJourneyStepStatuses(
  locals: JourneyTickerLocal[],
  aws: JourneyAwsSnapshot | null,
  _processControl?: JourneyProcessControl | null,
  nowPolling?: NowPollingSession | null
): Record<JourneyStepId, JourneyStepStatus> {
  const today = aws?.tradeDate ?? effectiveTradingDateEt();
  const readyTickers = locals.filter((t) => t.status === "ready");

  let anyPreRunning = false;
  let anyNowEval = false;
  let anyPostRunning = false;
  let anyPostReady = false;

  const postUpdatedAts: string[] = [];

  for (const local of readyTickers) {
    const pm = aws?.premarketBySymbol[local.symbol];
    const post = aws?.postmarketBySymbol[local.symbol];
    if (awsPremarketRunning(pm, today)) anyPreRunning = true;
    if (hasNowEvalToday(pm, today)) anyNowEval = true;
    if (awsPostmarketRunning(post, today)) anyPostRunning = true;
    if (awsPostmarketReadyToday(post, today)) {
      anyPostReady = true;
      if (post?.updatedAt) postUpdatedAts.push(post.updatedAt);
    }
  }

  const sessionClosed = shouldAutoStopWatchEt();
  const nowPollingActive = Boolean(nowPolling?.active);
  const nowPollingLabel = nowPollingStatusLabel(nowPolling);
  const awsNowStatus = aws?.nowPolling;
  const localLiveWatch = readyTickers.some((t) => t.liveEligible);
  const manualNowActive = isManualNowActive(awsNowStatus);
  const nowLastRun =
    awsNowStatus?.lastSessionPollAt ??
    awsNowStatus?.recentRuns?.[0]?.at ??
    (anyNowEval
      ? latestTimestamp(
          readyTickers.map((t) => aws?.premarketBySymbol[t.symbol]?.nowUpdatedAt)
        )
      : null);

  const postLastRun = latestTimestamp(postUpdatedAts);

  const postStats = aws?.postmarketStats;
  const postStatsReadyToday =
    postStats?.lastTradeDate === today && (postStats?.totalReports ?? 0) > 0;

  const nowStatus: JourneyStepStatus =
    anyPreRunning && readyTickers.some((t) => aws?.premarketBySymbol[t.symbol]?.mode === "now")
      ? { visual: "working", detail: "Evaluación NOW en curso…" }
      : nowPollingActive
        ? { visual: "working", detail: nowPollingLabel, lastRunAt: nowLastRun }
        : anyNowEval || nowLastRun || localLiveWatch || manualNowActive
          ? {
              visual: "done",
              detail: `${nowPollingLabel} · último intake/poll`,
              lastRunAt: nowLastRun,
            }
          : {
              visual: "pending",
              detail: `${nowPollingLabel} · Evaluate en Result Now o POST /tickers/check`,
            };

  const viewNow: JourneyStepStatus =
    anyNowEval || nowLastRun || nowPollingActive
      ? { visual: "view", detail: "Abrir Result Now", lastRunAt: nowLastRun }
      : { visual: "pending", detail: "Sin evaluación NOW aún — Evaluate o Start polling" };

  const postStatus: JourneyStepStatus = anyPostRunning
    ? { visual: "working", detail: "Post-market en curso…" }
    : anyPostReady || postStatsReadyToday
      ? {
          visual: "done",
          detail: "Post-market listo",
          lastRunAt: postLastRun ?? postStats?.updatedAt ?? null,
        }
      : sessionClosed
        ? { visual: "pending", detail: "Pulsa Iniciar (manual) o espera schedule ~5 PM ET" }
        : { visual: "pending", detail: "Pulsa Iniciar (manual) · mejor tras cierre · o schedule 5 PM" };

  const viewPost: JourneyStepStatus = anyPostRunning
    ? { visual: "working", detail: "Generando reporte…" }
    : anyPostReady || postStatsReadyToday
      ? { visual: "view", detail: "Abrir Result Postmarket", lastRunAt: postLastRun ?? postStats?.updatedAt ?? null }
      : { visual: "pending", detail: "Sin post-market del día — Actualizar en Result Postmarket" };

  return {
    "now-status": nowStatus,
    "view-result-now": viewNow,
    "post-status": postStatus,
    "view-result-post": viewPost,
  };
}

/** Ensure every journey step has a status (repairs stale persisted snapshots). */
export function resolveJourneyStepStatuses(
  locals: JourneyTickerLocal[],
  aws: JourneyAwsSnapshot | null,
  processControl?: JourneyProcessControl | null,
  nowPolling?: NowPollingSession | null,
  stored?: Partial<Record<JourneyStepId, JourneyStepStatus>> | null
): Record<JourneyStepId, JourneyStepStatus> {
  const built = buildJourneyStepStatuses(locals, aws, processControl, nowPolling);
  if (!stored) return built;
  const resolved = { ...built };
  for (const step of MARKET_AI_JOURNEY_STEPS) {
    const candidate = stored[step.id];
    if (candidate && typeof candidate.visual === "string") {
      resolved[step.id] = candidate;
    }
  }
  return resolved;
}

export function journeyStepClickable(
  step: JourneyStepDef,
  status: JourneyStepStatus | undefined
): boolean {
  if (!status) return false;
  if (step.kind === "view") {
    return status.visual === "view" || status.visual === "done" || status.visual === "working";
  }
  if (step.id === "post-status" && status.visual === "pending") {
    return true;
  }
  return false;
}

export function journeyPanelKeyForStep(stepId: JourneyStepId): "now" | "post" | null {
  const step = MARKET_AI_JOURNEY_STEPS.find((s) => s.id === stepId);
  return step?.panelKey ?? null;
}

export function journeyHasPremarketToday(
  locals: JourneyTickerLocal[],
  aws: JourneyAwsSnapshot | null
): boolean {
  const today = aws?.tradeDate ?? effectiveTradingDateEt();
  for (const local of locals.filter((t) => t.status === "ready")) {
    if (isPremarketToday(local.premarketDate, local.premarketAt, today)) return true;
    const pm = aws?.premarketBySymbol[local.symbol];
    if (awsPremarketReadyToday(pm, today)) return true;
  }
  return false;
}
