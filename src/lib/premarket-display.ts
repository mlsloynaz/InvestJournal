import type { FinanceAiPremarketAnalysis } from "@/lib/finance-ai-types";

import { tradingDateEt } from "@/lib/live-session-window";
import {
  filterStrategyFits,
  RESULT_NOW_FOCUS_STRATEGY_IDS,
  strategyProbabilityPct,
} from "@/lib/strategy-display";



export type PremarketFinanceAiRef = {

  premarketAt?: string | null;

  premarketDate?: string | null;

};



export type LatestStrategiesEval = Pick<

  FinanceAiPremarketAnalysis,

  | "symbol"

  | "date"

  | "revision"

  | "strategyChecklist"

  | "marketFoundation"

  | "panoramaCompleto"

  | "sessionGap"

  | "calendarGate"

  | "delta"

  | "assessmentPhase"

> & { updatedAt?: string };



function nestedPreAnalysis(

  base: NonNullable<FinanceAiPremarketAnalysis["preBaseline"]>

): FinanceAiPremarketAnalysis | null {

  const nested =

    base.analysis && typeof base.analysis === "object"

      ? (base.analysis as FinanceAiPremarketAnalysis)

      : null;

  return nested;

}



/** Morning PRE snapshot (narrative, Bedrock, checklist at cutoff). */

export function premarketBaselineFromAnalysis(

  analysis: FinanceAiPremarketAnalysis | null

): FinanceAiPremarketAnalysis | null {

  if (!analysis) return null;

  if (analysis.preBaseline) {

    const base = analysis.preBaseline;

    const nested = nestedPreAnalysis(base);

    return {

      ...analysis,

      ...(nested ?? {}),

      symbol: analysis.symbol,

      date: analysis.date,

      revision: base.revision ?? nested?.revision ?? analysis.revision,

      bias: base.bias ?? nested?.bias ?? analysis.bias,

      strategyChecklist:
        base.strategyChecklist ?? nested?.strategyChecklist ?? analysis.strategyChecklist,

      marketFoundation:
        base.marketFoundation ?? nested?.marketFoundation ?? analysis.marketFoundation,

      sessionGap: base.sessionGap ?? nested?.sessionGap ?? analysis.sessionGap,

      tradePlan: base.tradePlan ?? nested?.tradePlan,

      narrative: base.narrative ?? nested?.narrative,

      keyLevels: base.keyLevels ?? nested?.keyLevels,

      risks: base.risks ?? nested?.risks,

      doNotTrade: base.doNotTrade ?? nested?.doNotTrade,

      doNotTradeReasons: base.doNotTradeReasons ?? nested?.doNotTradeReasons,

      predictionSupport: base.predictionSupport ?? nested?.predictionSupport,

      strategyCandidates: base.strategyCandidates ?? nested?.strategyCandidates,

      bedrockSkipped: true,

      assessmentPhase: "PRE",

      dataCutoffEt:

        base.dataCutoffEt ?? nested?.dataCutoffEt ?? analysis.dataCutoffEt ?? "09:29 ET",

      updatedAt: base.updatedAt ?? nested?.updatedAt ?? analysis.updatedAt,

      mode: "full",

    };

  }

  return {

    ...analysis,

    assessmentPhase: "PRE",

    mode: "full",

    bedrockSkipped: true,

  };

}



function isNowOnlyPremarketRow(analysis: FinanceAiPremarketAnalysis): boolean {

  if (analysis.preBaseline?.strategyChecklist) return false;

  return analysis.assessmentPhase === "NOW" || analysis.mode === "now" || Boolean(analysis.nowUpdatedAt);

}



/** PRE-only saved row for UI — hides live NOW checklist when there is no PRE snapshot. */

export function premarketResultForDisplay(

  analysis: FinanceAiPremarketAnalysis | null

): FinanceAiPremarketAnalysis | null {

  const baseline = premarketBaselineFromAnalysis(analysis);

  if (!baseline) return null;

  if (isNowOnlyPremarketRow(analysis)) {

    return {

      ...baseline,

      strategyChecklist: undefined,

      marketFoundation: undefined,

      preDisplayNote:

        "Sin snapshot PRE del día — solo hay evaluación NOW en AWS. Ejecuta Iniciar PRE (modo full).",

    };

  }

  return {

    ...baseline,

    strategyChecklist:

      baseline.strategyChecklist ??

      analysis?.strategyChecklist ??

      analysis?.preBaseline?.strategyChecklist,

    marketFoundation:

      baseline.marketFoundation ??

      analysis?.marketFoundation ??

      analysis?.preBaseline?.marketFoundation,

    calendarGate:

      baseline.calendarGate ??

      analysis?.calendarGate ??

      baseline.strategyChecklist?.calendarGate,

    sessionGap: baseline.sessionGap ?? analysis?.sessionGap,

    marketCalendar: baseline.marketCalendar ?? analysis?.marketCalendar,

    newsSentiment: baseline.newsSentiment ?? analysis?.newsSentiment,

    bedrockSkipped: true,

    bedrockError: undefined,

    preDisplayNote: premarketDisplayNote(analysis) ?? undefined,

  };

}



/** Latest strategy checklist / foundation (live NOW row or PRE before first refresh). */

export function latestStrategiesFromAnalysis(

  analysis: FinanceAiPremarketAnalysis | null

): LatestStrategiesEval | null {

  if (!analysis) return null;

  const hasNow = analysis.assessmentPhase === "NOW" || Boolean(analysis.nowUpdatedAt);

  if (hasNow) {

    if (!analysis.strategyChecklist && !analysis.marketFoundation) return null;

    return {

      symbol: analysis.symbol,

      date: analysis.date,

      revision: analysis.revision,

      assessmentPhase: "NOW",

      updatedAt: analysis.nowUpdatedAt ?? analysis.updatedAt,

      strategyChecklist: analysis.strategyChecklist,

      marketFoundation: analysis.marketFoundation,

      sessionGap: analysis.sessionGap,

      calendarGate: analysis.calendarGate,

      delta: analysis.delta,

    };

  }

  if (!analysis.strategyChecklist && !analysis.marketFoundation) return null;

  return {

    symbol: analysis.symbol,

    date: analysis.date,

    revision: analysis.revision,

    assessmentPhase: "PRE",

    updatedAt: analysis.updatedAt,

    strategyChecklist: analysis.strategyChecklist,

    marketFoundation: analysis.marketFoundation,

    sessionGap: analysis.sessionGap,

    calendarGate: analysis.calendarGate,

  };

}



/** Baseline narrative + latest checklist (badges, strategy eval). */

export function analysisForStrategyEval(

  analysis: FinanceAiPremarketAnalysis | null

): FinanceAiPremarketAnalysis | null {

  const baseline = premarketBaselineFromAnalysis(analysis);

  const latest = latestStrategiesFromAnalysis(analysis);

  if (!baseline && !latest) return null;

  if (!latest) return baseline;

  if (!baseline) {

    return {

      ...(latest as FinanceAiPremarketAnalysis),

      updatedAt: latest.updatedAt,

    };

  }

  return {

    ...baseline,

    strategyChecklist: latest.strategyChecklist ?? baseline.strategyChecklist,

    marketFoundation: latest.marketFoundation ?? baseline.marketFoundation,

    panoramaCompleto:
      latest.panoramaCompleto ??
      latest.marketFoundation?.panoramaCompleto ??
      latest.strategyChecklist?.panoramaCompleto ??
      baseline.panoramaCompleto ??
      baseline.marketFoundation?.panoramaCompleto,

    sessionGap: latest.sessionGap ?? baseline.sessionGap,

    calendarGate: latest.calendarGate ?? baseline.calendarGate,

    assessmentPhase: latest.assessmentPhase ?? baseline.assessmentPhase,

    nowUpdatedAt: latest.assessmentPhase === "NOW" ? latest.updatedAt : undefined,

    delta: latest.delta,

  };

}



/** Check Ticker / live eval — calendar, news, foundation, strategy checklist with progress bars. */
export function tickerEvalResultForDisplay(

  analysis: FinanceAiPremarketAnalysis | null

): FinanceAiPremarketAnalysis | null {

  const merged = analysisForStrategyEval(analysis);

  if (!merged) return null;

  const phase = merged.assessmentPhase ?? analysis?.assessmentPhase ?? "NOW";

  return {

    ...merged,

    strategyChecklist:

      merged.strategyChecklist ??

      analysis?.strategyChecklist ??

      analysis?.preBaseline?.strategyChecklist,

    marketFoundation:

      merged.marketFoundation ??

      analysis?.marketFoundation ??

      analysis?.preBaseline?.marketFoundation,

    calendarGate:

      merged.calendarGate ??

      analysis?.calendarGate ??

      merged.strategyChecklist?.calendarGate,

    sessionGap: merged.sessionGap ?? analysis?.sessionGap,

    marketCalendar: merged.marketCalendar ?? analysis?.marketCalendar,

    newsSentiment: merged.newsSentiment ?? analysis?.newsSentiment,

    panoramaCompleto:

      merged.panoramaCompleto ??

      analysis?.panoramaCompleto ??

      merged.marketFoundation?.panoramaCompleto ??

      merged.strategyChecklist?.panoramaCompleto,

    assessmentPhase: phase,

    dataCutoffEt:

      analysis?.dataCutoffEt ??

      merged.dataCutoffEt ??

      merged.strategyChecklist?.evalDataWindow?.dataCutoffEt ??

      (phase === "PRE" ? "09:29 ET" : undefined),

    bedrockSkipped: true,

    bedrockError: undefined,

    preDisplayNote: premarketDisplayNote(analysis) ?? undefined,

  };

}



/** @deprecated Use premarketBaselineFromAnalysis + latestStrategiesFromAnalysis. */

export function premarketForDisplay(

  analysis: FinanceAiPremarketAnalysis | null

): FinanceAiPremarketAnalysis | null {

  return premarketBaselineFromAnalysis(analysis);

}



/** Prefer persisted trade date when loading stored pre-market from AWS. */

export function resolvePremarketFetchDate(

  financeAi?: PremarketFinanceAiRef

): string | undefined {

  if (financeAi?.premarketDate?.trim()) return financeAi.premarketDate.trim();

  if (financeAi?.premarketAt) return tradingDateEt(new Date(financeAi.premarketAt));

  return undefined;

}



export function hasStoredPremarket(financeAi?: PremarketFinanceAiRef | null): boolean {

  return Boolean(financeAi?.premarketAt || financeAi?.premarketDate);

}



/** GET /premarket 404 — distinct from failed check or missing TickerContext. */

export function isStoredPremarketMissingError(error?: string | null): boolean {

  if (!error?.trim()) return false;

  const e = error.toLowerCase();

  return (

    e.includes("no premarket analysis") ||

    (e.includes("post /tickers/") && e.includes("/premarket first"))

  );

}



export function isMissingStoredPremarketRow(

  analysis: FinanceAiPremarketAnalysis | null | undefined

): boolean {

  if (!analysis) return true;

  if (analysis.status === "error") {

    return isStoredPremarketMissingError(analysis.error);

  }

  return false;

}



export const PREMARKET_ESTIMATED_FROM_MAINTENANCE_NOTE =

  "Vista estimada desde barras del mantenimiento 1:00 AM (TickerContext). Sin PRE guardado del job 7:00 — usa «Iniciar PRE» en el ticker para persistir el análisis.";



export const PREMARKET_FOUNDATION_NOTE =

  "Foundation 1:00 AM — checklist PRE desde barras históricas. «Iniciar PRE» añade premarket en vivo; BB15 incrementa en 9:30:30+.";



export function isPremarketFoundationRow(

  analysis: FinanceAiPremarketAnalysis | null | undefined

): boolean {

  if (!analysis) return false;

  if (analysis.mode === "foundation") return true;

  return analysis.source === "daily_maintenance";

}



export function premarketDisplayNote(

  analysis: FinanceAiPremarketAnalysis | null | undefined

): string | undefined {

  if (!analysis) return undefined;

  if (analysis.foundationNote?.trim()) return analysis.foundationNote.trim();

  if (isPremarketFoundationRow(analysis)) return PREMARKET_FOUNDATION_NOTE;

  if (analysis.preDisplayNote?.trim()) return analysis.preDisplayNote.trim();

  if (analysis.ephemeral || analysis.mode === "check") {

    return PREMARKET_ESTIMATED_FROM_MAINTENANCE_NOTE;

  }

  return undefined;

}



export function friendlyAnalysisLoadError(error?: string | null): string | undefined {

  if (!error?.trim()) return undefined;

  if (isStoredPremarketMissingError(error)) {

    return "Sin PRE guardado (7:00). Usa Verificar para checklist estimado desde mantenimiento 1:00 AM.";

  }

  return error;

}



export type PremarketBaselineRef = {

  bias?: string | null;

  updatedAt?: string | null;

  dataCutoffEt?: string | null;

  revision?: number | null;

};



export type PremarketUpdatedView = {

  symbol: string;

  hasLiveUpdate: boolean;

  updatedAt?: string;

  phase: "NOW" | "PRE";

  baselineRef: PremarketBaselineRef | null;

  live: LatestStrategiesEval | null;

  merged: FinanceAiPremarketAnalysis | null;

  proximityNote: string | null;

  waitNote: string | null;

  contextForBrief: FinanceAiPremarketAnalysis | null;

};



export type ResultNowLiveSignals = {

  trackerEvalUpdatedAt?: string | null;

  awsPollLastRunAt?: string | null;

  tradeDate?: string | null;

};



function isTimestampOnTradeDateEt(iso: string, tradeDate?: string | null): boolean {

  const td = tradeDate?.trim() || tradingDateEt();

  const dateEt = new Intl.DateTimeFormat("en-CA", {

    timeZone: "America/New_York",

    year: "numeric",

    month: "2-digit",

    day: "2-digit",

  }).format(new Date(iso));

  return dateEt === td;

}



/** Compare focus strategy probability PRE snapshot vs live NOW row. */

export function strategyProximityVsPre(

  baseline: FinanceAiPremarketAnalysis | null,

  live: LatestStrategiesEval | null,

  strategyIds: readonly string[] = RESULT_NOW_FOCUS_STRATEGY_IDS

): string | null {

  const preList = filterStrategyFits(baseline?.strategyChecklist?.strategies, strategyIds);

  const nowList = filterStrategyFits(live?.strategyChecklist?.strategies, strategyIds);

  const preStrat = preList[0];

  const nowStrat = nowList[0];

  if (!preStrat || !nowStrat) return null;

  const prePct = strategyProbabilityPct(preStrat);

  const nowPct = strategyProbabilityPct(nowStrat);

  const cutoff = baseline?.dataCutoffEt ?? baseline?.preBaseline?.dataCutoffEt ?? "09:29 ET";

  if (nowPct > prePct) {

    return `Más cerca de cumplir vs PRE guardado ${cutoff} (${prePct}% → ${nowPct}%).`;

  }

  if (nowPct < prePct) {

    return `Más lejos vs PRE guardado ${cutoff} (${prePct}% → ${nowPct}%).`;

  }

  return `Misma probabilidad vs PRE guardado ${cutoff} (${nowPct}%).`;

}



/** Result Now: live checklist vs frozen PRE — not a duplicate of Pre-market (guardado). */

export function premarketUpdatedForResultNow(

  analysis: FinanceAiPremarketAnalysis | null,

  signals?: ResultNowLiveSignals | null

): PremarketUpdatedView | null {

  if (!analysis) return null;

  const baseline = premarketBaselineFromAnalysis(analysis);

  const live = latestStrategiesFromAnalysis(analysis);

  const signalUpdatedAt =

    (signals?.trackerEvalUpdatedAt &&

      isTimestampOnTradeDateEt(signals.trackerEvalUpdatedAt, signals.tradeDate) &&

      signals.trackerEvalUpdatedAt) ||

    (signals?.awsPollLastRunAt &&

      isTimestampOnTradeDateEt(signals.awsPollLastRunAt, signals.tradeDate) &&

      signals.awsPollLastRunAt) ||

    null;

  const hasLiveUpdate =

    live?.assessmentPhase === "NOW" ||

    Boolean(analysis.nowUpdatedAt) ||

    analysis.assessmentPhase === "NOW" ||

    analysis.mode === "now" ||

    Boolean(signalUpdatedAt);

  const baselineRef: PremarketBaselineRef | null = baseline

    ? {

        bias: baseline.bias,

        updatedAt: baseline.updatedAt,

        dataCutoffEt: baseline.dataCutoffEt ?? "09:29 ET",

        revision: baseline.revision,

      }

    : null;

  if (!hasLiveUpdate) {

    return {

      symbol: analysis.symbol,

      hasLiveUpdate: false,

      phase: "PRE",

      baselineRef,

      live: null,

      merged: null,

      proximityNote: null,

      waitNote:

        "Sin actualización NOW aún — espera el próximo check programado o ejecuta NOW manual.",

      contextForBrief: baseline ?? analysis,

    };

  }

  const merged = analysisForStrategyEval(analysis);

  const proximityNote = strategyProximityVsPre(baseline, live);

  return {

    symbol: analysis.symbol,

    hasLiveUpdate: true,

    updatedAt:

      analysis.nowUpdatedAt ?? live?.updatedAt ?? signalUpdatedAt ?? analysis.updatedAt,

    phase: "NOW",

    baselineRef,

    live,

    merged,

    proximityNote,

    waitNote: null,

    contextForBrief: merged ?? analysis,

  };

}


