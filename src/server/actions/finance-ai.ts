"use server";

import { revalidatePath } from "next/cache";
import { MARKET_PATH } from "@/lib/tools-paths";
import { formatFinanceAiTimestamp } from "@/lib/format-datetime";
import { tradingDateEt, effectiveTradingDateEt } from "@/lib/live-session-window";
import {
  isStoredPremarketMissingError,
  PREMARKET_ESTIMATED_FROM_MAINTENANCE_NOTE,
} from "@/lib/premarket-display";
import type { FinanceAiMarketCalendar, FinanceAiNewsSentiment, FinanceAiNowPollingStatus, FinanceAiPostmarketAnalysis, FinanceAiPostmarketStats, FinanceAiPremarketAnalysis, FinanceAiStrategyFit, FinanceAiStrategyMetStatus, FinanceAiTickerContext, FinanceAiBolinger15FastMovementStatus, FinanceAiStrategyAlert, FinanceAiTickersNow } from "@/lib/finance-ai-types";
import type {
  FinanceAiDailyMaintenanceResult,
  FinanceAiDailyMaintenanceStatus,
} from "@/server/services/finance-ai-client";
import {
  FinanceAiConfigError,
  type FinanceAiStoredCalendar,
  getAnalysisFrameworkContext,
  getMarketCalendar,
  getNewsSentiment,
  getNowPollingStatus,
  getMov15mStatus,
  getMov15mStatusSummary,
  postMov15mTick,
  cancelMov15mOrder,
  getMov15mOrdersBySymbol,
  patchMov15mOrderLimit,
  postMov15mTradingOrder,
  getMov15mOrderFill,
  getMov15mOrderStatus,
  type FinanceAiTradingOrderResult,
  type FinanceAiTradingOrderFillStatus,
  getRecentAlerts,
  getAlertsSettings,
  putAlertsSettings,
  getStrategyMetStatus,
  getPostmarket,
  enrollNow,
  getPostmarketStats,
  getPremarket,
  getStrategiesContext,
  getTickerContext,
  getDailyMaintenanceDetail,
  refreshDailyMaintenance,
  isFinanceAiConfigured,
  publishAnalysisFramework,
  publishStrategies,
  refreshMarketCalendar,
  refreshNewsSentiment,
  runPostmarket,
  checkTicker,
  runPremarket,
  runNowAssessment,
  runNowAiAssessment,
  recomputeTickersNow,
  manualPrecheckTickersNow,
  runNowIntakeBatch,
  getScheduleSettings,
  runStrategyEvalCheck,
  triggerStrategyEvalFlow,
  getStrategyEvalResult,
  type FinanceAiStrategyEvalResult,
  type FinanceAiStrategyEvalTickerResult,
} from "@/server/services/finance-ai-client";
import {
  clearAllTickerLiveWatching,
  listCalendarRefreshSymbols,
  listTickersForGestion,
  listTickersForTickerContext,
  persistTickerFinanceAiPremarket,
  persistTickerFinanceAiState,
} from "@/server/actions/tickers";
import { buildAnalysisFrameworkPublishPayload } from "@/server/services/finance-ai-framework-export";
import { buildStrategiesPublishPayload } from "@/server/services/finance-ai-strategies-export";
import { persistMov15mStatus, loadPersistedMov15mStatus } from "@/server/actions/mov15m-snapshot";
import { persistTickersToday15mPool } from "@/server/actions/tickers";
import {
  firstSchwabAuthError,
  type PrePremarketPrerequisitesStatus,
} from "@/lib/pre-premarket-prerequisites";

export type FinanceAiActionResult = {
  success: boolean;
  message?: string;
  error?: string;
  updatedAt?: string;
};

export type FinanceAiCalendarActionResult = FinanceAiActionResult & {
  calendar?: FinanceAiStoredCalendar;
};

function revalidateGestion() {
  revalidatePath(MARKET_PATH);
  revalidatePath("/config/aws");
}

function configError(): FinanceAiActionResult {
  return {
    success: false,
    error: "Configura FINANCE_AI_API_URL y FINANCE_AI_API_KEY en .env",
  };
}

export async function getFinanceAiConfigStatus(): Promise<{ configured: boolean }> {
  return { configured: isFinanceAiConfigured() };
}

export async function publishStrategiesToFinanceAi(): Promise<FinanceAiActionResult> {
  if (!isFinanceAiConfigured()) return configError();
  try {
    const payload = await buildStrategiesPublishPayload();
    const result = await publishStrategies(payload);
    if (!result.ok) return { success: false, error: result.error };
    revalidateGestion();
    const reqCount = payload.playbooks.reduce(
      (n, p) =>
        n +
        (Array.isArray((p as { requirements?: unknown[] }).requirements)
          ? (p as { requirements: unknown[] }).requirements.length
          : 0) +
        (Array.isArray((p as { variants?: { requirements?: unknown[] }[] }).variants)
          ? (p as { variants: { requirements?: unknown[] }[] }).variants.reduce(
              (vn, v) => vn + (v.requirements?.length ?? 0),
              0
            )
          : 0),
      0
    );
    return {
      success: true,
      message: `Estrategias publicadas (${payload.sourceFiles.length} MD, ${payload.playbooks.length} playbooks, ${reqCount} reqs, ${result.data.contentLength ?? payload.content.length} chars)`,
      updatedAt: result.data.updatedAt,
    };
  } catch (e) {
    if (e instanceof FinanceAiConfigError) return configError();
    return { success: false, error: e instanceof Error ? e.message : "Error desconocido" };
  }
}

export async function publishAnalysisFrameworkToFinanceAi(): Promise<FinanceAiActionResult> {
  if (!isFinanceAiConfigured()) return configError();
  try {
    const payload = buildAnalysisFrameworkPublishPayload();
    const result = await publishAnalysisFramework(payload);
    if (!result.ok) return { success: false, error: result.error };
    revalidateGestion();
    return {
      success: true,
      message: `Marco de análisis publicado (${result.data.contentLength ?? payload.content.length} chars)`,
      updatedAt: result.data.updatedAt,
    };
  } catch (e) {
    if (e instanceof FinanceAiConfigError) return configError();
    return { success: false, error: e instanceof Error ? e.message : "Error desconocido" };
  }
}

export async function persistFinanceAiTickerState(
  symbol: string,
  data: {
    status: string;
    error?: string | null;
    lastBarAt?: string | null;
  }
): Promise<void> {
  await persistTickerFinanceAiState(symbol, data);
}

export type DailyMaintenancePanelPayload = {
  success: boolean;
  error?: string;
  dailyMaintenance?: FinanceAiDailyMaintenanceStatus | null;
  result?: FinanceAiDailyMaintenanceResult | null;
};

/** POST /bars/refresh — incremental or full D+1h+15m reset (no BB15 / pipeline eval). */
export async function triggerFinanceAiBarRequest(
  symbols?: string[],
  options?: { resetBars?: boolean }
): Promise<FinanceAiActionResult> {
  if (!isFinanceAiConfigured()) return configError();
  const symbolList = symbols?.map((s) => s.trim().toUpperCase()).filter(Boolean);
  const resetBars = options?.resetBars ?? false;
  const result = await refreshDailyMaintenance({
    symbols: symbolList?.length ? symbolList : undefined,
    skipBb15: true,
    skipPipelineEval: true,
    resetBars,
  });
  if (!result.ok) {
    return { success: false, error: result.error };
  }
  const detail = await getDailyMaintenanceDetail();
  const barResult = detail.ok ? detail.data.result : null;
  const okCount = barResult?.successCount ?? 0;
  const requested = symbolList?.length ?? barResult?.successCount ?? 0;
  if (barResult && okCount === 0 && (barResult.failedCount || barResult.skippedCount)) {
    const sample = (barResult.failedSymbols ?? barResult.skippedSymbols ?? []).slice(0, 5).join(", ");
    return {
      success: false,
      error: `bars/refresh: 0 tickers OK${sample ? ` (${sample}…)` : ""} — revisa Ticker Context o CloudWatch.`,
    };
  }
  revalidateGestion();
  const kind = resetBars ? "reset" : "incremental";
  const label = symbolList?.length ? symbolList.join(", ") : "todos los tickers";
  return {
    success: true,
    message: `bars/refresh ${kind} completado (${label}).`,
  };
}

export type FoundationFor15mActionResult = FinanceAiActionResult & {
  foundationCount?: number;
};

/** POST /bars/refresh with foundation eval (checklist per ticker, no TickersToday15M pool). */
export async function triggerFinanceAiFoundationFor15m(
  symbols?: string[]
): Promise<FoundationFor15mActionResult> {
  if (!isFinanceAiConfigured()) return configError();
  const symbolList = symbols?.map((s) => s.trim().toUpperCase()).filter(Boolean);
  const result = await refreshDailyMaintenance({
    symbols: symbolList?.length ? symbolList : undefined,
    skipBb15: false,
    skipPipelineEval: false,
    resetBars: false,
  });
  if (!result.ok) {
    return { success: false, error: result.error };
  }
  const detail = await getDailyMaintenanceDetail();
  const barResult = detail.ok ? detail.data.result : null;
  const foundationCount = barResult?.pipelineEval?.foundationCount ?? undefined;
  const okCount = barResult?.successCount ?? 0;
  if (barResult && okCount === 0 && (barResult.failedCount || barResult.skippedCount)) {
    const sample = (barResult.failedSymbols ?? barResult.skippedSymbols ?? []).slice(0, 5).join(", ");
    return {
      success: false,
      error: `Actualizar barras + foundation: 0 tickers OK en barras${sample ? ` (${sample}…)` : ""}.`,
    };
  }
  revalidateGestion();
  const label = symbolList?.length ? symbolList.join(", ") : "todos los tickers";
  const foundationLabel =
    foundationCount != null ? ` · foundation: ${foundationCount}` : "";
  return {
    success: true,
    message: `Actualizar barras + foundation completado (${label})${foundationLabel}.`,
    foundationCount,
  };
}

/** Recopilar — per-ticker result from GlobalContext `dailyMaintenanceResult`. */
export async function fetchDailyMaintenanceForTickerPanel(): Promise<DailyMaintenancePanelPayload> {
  if (!isFinanceAiConfigured()) {
    return { success: false, error: "FinanceAI no configurado." };
  }
  const detail = await getDailyMaintenanceDetail();
  if (!detail.ok) {
    return { success: false, error: detail.error };
  }
  return {
    success: true,
    dailyMaintenance: detail.data.dailyMaintenance ?? null,
    result: detail.data.result ?? null,
  };
}

export async function persistFinanceAiPremarketRun(
  symbol: string,
  data: {
    mode: string;
    bias?: string | null;
    revision?: number | null;
    tradeDate?: string | null;
    gapEntry?: boolean;
  }
): Promise<void> {
  await persistTickerFinanceAiPremarket(symbol, data);
  revalidateGestion();
}

export async function fetchFinanceAiTickerContext(
  symbol: string
): Promise<{ success: boolean; context?: FinanceAiTickerContext; error?: string }> {
  if (!isFinanceAiConfigured()) {
    return { success: false, error: "FinanceAI no configurado" };
  }
  const result = await getTickerContext(symbol.toUpperCase());
  if (!result.ok) return { success: false, error: result.error };
  return { success: true, context: result.data };
}

export async function fetchFinanceAiPublishMeta(): Promise<{
  strategies?: { updatedAt?: string; filename?: string };
  framework?: { updatedAt?: string; filename?: string };
}> {
  if (!isFinanceAiConfigured()) return {};
  const [strategies, framework] = await Promise.all([
    getStrategiesContext(),
    getAnalysisFrameworkContext(),
  ]);
  return {
    strategies: strategies.ok
      ? { updatedAt: strategies.data.updatedAt, filename: strategies.data.filename }
      : undefined,
    framework: framework.ok
      ? { updatedAt: framework.data.updatedAt, filename: framework.data.filename }
      : undefined,
  };
}

export async function fetchFinanceAiMarketCalendar(): Promise<{
  success: boolean;
  calendar?: FinanceAiStoredCalendar;
  error?: string;
}> {
  if (!isFinanceAiConfigured()) {
    return { success: false, error: "FinanceAI no configurado" };
  }
  const result = await getMarketCalendar();
  if (!result.ok) return { success: false, error: result.error };
  return { success: true, calendar: result.data };
}

/** Live prerequisite checks for Ticker Context (strategies, calendar, bars, Schwab token). */
export async function fetchPrePremarketPrerequisites(): Promise<{
  success: boolean;
  data?: PrePremarketPrerequisitesStatus;
  error?: string;
}> {
  if (!isFinanceAiConfigured()) {
    return { success: false, error: "FinanceAI no configurado" };
  }

  const [strategies, calendar, mysqlTickers, maintenance] = await Promise.all([
    getStrategiesContext(),
    getMarketCalendar(),
    listTickersForTickerContext(),
    getDailyMaintenanceDetail(),
  ]);

  const strategiesData = strategies.ok ? strategies.data : null;
  const playbookCount =
    strategies.ok && "playbooksCount" in strategies.data
      ? Number((strategies.data as { playbooksCount?: number }).playbooksCount ?? 0)
      : 0;
  const strategiesOk =
    strategies.ok && Boolean(strategiesData?.content?.trim()) && playbookCount > 0;

  const calendarOk = calendar.ok;
  const total = mysqlTickers.length;
  const withBars = maintenance.ok ? maintenance.data.result?.successCount ?? 0 : 0;
  const missingSample: string[] = [];
  const tickerOk = withBars > 0 && withBars >= total;

  const maintenanceFailures = maintenance.ok
    ? (maintenance.data.result?.sampleFailures ?? []).map((row) => row.detail)
    : [];
  const barSampleFailures: string[] = [];
  const schwabDetail = firstSchwabAuthError([
    ...barSampleFailures,
    ...maintenanceFailures,
    maintenance.ok ? undefined : maintenance.error,
  ]);

  return {
    success: true,
    data: {
      strategies: {
        ok: strategiesOk,
        updatedAt: strategiesData?.updatedAt ?? null,
        playbookCount: strategiesOk ? playbookCount : undefined,
        hint: strategiesOk
          ? `Publicado · ${playbookCount} playbook(s)`
          : strategies.ok
            ? "Sin playbooks — Config → Publicar estrategias"
            : "Falta GlobalContext strategies — Config → Publicar estrategias",
      },
      marketCalendar: {
        ok: calendarOk,
        updatedAt: calendarOk ? calendar.data.updatedAt ?? null : null,
        hint: calendarOk
          ? `Cargado${calendar.data.month ? ` · ${calendar.data.month}` : ""}`
          : "404 — Ticker Context → Request Earning Calendar",
      },
      tickerContext: {
        ok: tickerOk,
        withBars,
        total,
        missingSample,
        hint: tickerOk
          ? `${withBars}/${total} con barras (status ready)`
          : withBars > 0
            ? `${withBars}/${total} con barras — Actualizar barras en faltantes`
            : "Sin TickerContext con barras — Actualizar barras",
      },
      schwabAuth: {
        ok: !schwabDetail,
        hint: schwabDetail
          ? "Token Schwab inválido — scripts/schwab_auth.py"
          : "Token Schwab OK (último bar-request)",
        detail: schwabDetail,
      },
    },
  };
}

export async function refreshFinanceAiMarketCalendar(): Promise<FinanceAiCalendarActionResult> {
  if (!isFinanceAiConfigured()) return configError();
  const symbols = await listCalendarRefreshSymbols();
  const result = await refreshMarketCalendar(symbols);
  if (!result.ok) return { success: false, error: result.error };
  revalidateGestion();
  const symLabel =
    symbols.length > 0
      ? `${symbols.length} ticker(s) from Config table`
      : "ninguno (añade tickers en Config)";
  return {
    success: true,
    message: `Earnings calendar · ${result.data.month ?? "mes"} · ${symLabel} · FOMC ${result.data.fomcCount ?? 0} · earnings ${result.data.earningsCount ?? 0}${
      result.data.skippedRefresh
        ? " · ya cargado este mes (sin llamada Finnhub)"
        : ""
    }`,
    updatedAt: result.data.updatedAt,
    calendar: result.data,
  };
}

export async function fetchFinanceAiNewsSentiment(
  symbol: string
): Promise<{ success: boolean; news?: FinanceAiNewsSentiment; error?: string }> {
  if (!isFinanceAiConfigured()) {
    return { success: false, error: "FinanceAI no configurado" };
  }
  const result = await getNewsSentiment(symbol.toUpperCase());
  if (!result.ok) return { success: false, error: result.error };
  return { success: true, news: result.data };
}

export async function refreshFinanceAiNewsSentiment(
  symbol: string
): Promise<FinanceAiActionResult & { news?: FinanceAiNewsSentiment }> {
  if (!isFinanceAiConfigured()) return configError();
  const result = await refreshNewsSentiment(symbol.toUpperCase());
  if (!result.ok) return { success: false, error: result.error };
  revalidateGestion();
  return {
    success: true,
    message: `News AV · ${result.data.count ?? 0} artículos · score ${result.data.averageScore ?? 0}`,
    updatedAt: result.data.fetchedAt,
    news: result.data,
  };
}

export async function fetchFinanceAiPremarket(
  symbol: string,
  tradeDate?: string
): Promise<{ success: boolean; analysis?: FinanceAiPremarketAnalysis; error?: string }> {
  if (!isFinanceAiConfigured()) {
    return { success: false, error: "FinanceAI no configurado" };
  }
  const dates = [
    tradeDate?.trim(),
    effectiveTradingDateEt(),
    tradingDateEt(),
  ].filter((d, i, arr): d is string => Boolean(d) && arr.indexOf(d) === i);

  let lastError = "No hay pre-market guardado.";
  for (const date of dates) {
    const result = await getPremarket(symbol.toUpperCase(), date);
    if (result.ok) {
      return { success: true, analysis: result.data };
    }
    lastError = result.error;
  }
  return { success: false, error: lastError };
}

/** Stored PRE when available; otherwise ephemeral POST /check (1 AM bars). */
export async function fetchFinanceAiPremarketForDisplay(
  symbol: string,
  tradeDate?: string
): Promise<{
  success: boolean;
  analysis?: FinanceAiPremarketAnalysis;
  error?: string;
  fromCheck?: boolean;
}> {
  const stored = await fetchFinanceAiPremarket(symbol, tradeDate);
  if (stored.success && stored.analysis) {
    return stored;
  }
  if (!isStoredPremarketMissingError(stored.error)) {
    return stored;
  }

  const checked = await checkFinanceAiTicker(symbol.trim().toUpperCase());
  if (!checked.success || !checked.analysis) {
    return {
      success: false,
      error: checked.error ?? stored.error,
    };
  }

  return {
    success: true,
    fromCheck: true,
    analysis: {
      ...checked.analysis,
      preDisplayNote: PREMARKET_ESTIMATED_FROM_MAINTENANCE_NOTE,
    },
  };
}

/** Ephemeral strategy check — no DynamoDB writes, any symbol. */
export async function checkFinanceAiTicker(
  symbol: string
): Promise<{ success: boolean; analysis?: FinanceAiPremarketAnalysis; error?: string }> {
  if (!isFinanceAiConfigured()) {
    return { success: false, error: "FinanceAI no configurado" };
  }
  const sym = symbol.trim().toUpperCase();
  if (!sym || !/^[A-Z]+$/.test(sym)) {
    return { success: false, error: "Símbolo inválido" };
  }
  const result = await checkTicker(sym);
  if (!result.ok) {
    return { success: false, error: result.error };
  }
  return { success: true, analysis: result.data };
}

/** Playbook ids from Config AWS (evaluateStrategyIds / effective). */
export async function getConfiguredEvaluateStrategyIds(): Promise<string[]> {
  if (!isFinanceAiConfigured()) return [];
  const schedules = await getScheduleSettings();
  if (!schedules.ok) return ["estrategia-01"];
  if (schedules.data.evaluateStrategyIdsEffective?.length) {
    return schedules.data.evaluateStrategyIdsEffective;
  }
  if (schedules.data.evaluateStrategyIds?.length) {
    return schedules.data.evaluateStrategyIds;
  }
  return ["estrategia-01"];
}

export type MarketNowEvaluationMode = "now" | "at";

export type MarketNowEvalStatus = "idle" | "running" | "complete" | "error";

export type MarketNowEvaluationTickerResult = {
  symbol: string;
  success: boolean;
  error?: string;
  analysis?: FinanceAiPremarketAnalysis;
  strategies: FinanceAiStrategyFit[];
};

function coerceStrategyEvalTickerRow(
  row: FinanceAiStrategyEvalTickerResult
): FinanceAiStrategyEvalTickerResult {
  const raw = row as FinanceAiStrategyEvalTickerResult & Record<string, unknown>;
  const analysis =
    row.analysis ??
    (raw.premarketAnalysis as FinanceAiPremarketAnalysis | undefined) ??
    (raw.premarket as FinanceAiPremarketAnalysis | undefined) ??
    (raw.check as FinanceAiPremarketAnalysis | undefined) ??
    (raw.result as FinanceAiPremarketAnalysis | undefined);
  const error =
    row.error ??
    (typeof raw.message === "string" ? raw.message : undefined) ??
    (typeof raw.reason === "string" ? raw.reason : undefined) ??
    analysis?.error ??
    analysis?.message;
  return { ...row, analysis, error };
}

function strategyEvalRowError(row: FinanceAiStrategyEvalTickerResult): string {
  if (row.error?.trim()) return row.error.trim();
  const analysis = row.analysis;
  if (analysis?.error?.trim()) return analysis.error.trim();
  if (analysis?.message?.trim()) return analysis.message.trim();
  if (analysis?.bedrockError?.trim()) return analysis.bedrockError.trim();
  if (row.success === false) return "Evaluación fallida (sin detalle de AWS)";
  return "Error al evaluar (sin analysis en tickers/check)";
}

function isCompactStrategyEvalSuccess(row: FinanceAiStrategyEvalTickerResult): boolean {
  if (row.analysis || row.success === false) return false;
  return (
    row.success === true ||
    (row.strategyCount ?? 0) > 0 ||
    row.bestProbabilityPct != null ||
    row.persisted === true
  );
}

async function hydrateStrategyEvalRows(
  rows: FinanceAiStrategyEvalTickerResult[] | undefined,
  options: {
    strategyIds: string[];
    tradeDate?: string;
    timeEt?: string;
  }
): Promise<FinanceAiStrategyEvalTickerResult[]> {
  const normalized = (rows ?? []).map(coerceStrategyEvalTickerRow);
  const out: FinanceAiStrategyEvalTickerResult[] = [];

  for (const row of normalized) {
    if (row.analysis || !isCompactStrategyEvalSuccess(row)) {
      out.push(row);
      continue;
    }

    const symbol = row.symbol.trim().toUpperCase();
    const check = await checkTicker(symbol, {
      strategies: options.strategyIds,
      tradeDate: options.tradeDate,
      ...(options.timeEt ? { simulationTimeEt: options.timeEt } : {}),
      fresh: row.persisted === true ? false : true,
    });
    if (check.ok) {
      out.push({ symbol, success: true, analysis: check.data });
    } else {
      out.push({
        symbol,
        success: false,
        error: check.error ?? strategyEvalRowError(row),
      });
    }
  }

  return out;
}

function mapStrategyEvalRows(
  rows: FinanceAiStrategyEvalTickerResult[] | undefined,
  strategyIds: string[]
): MarketNowEvaluationTickerResult[] {
  const allow = new Set(strategyIds.map((id) => id.toLowerCase()));
  return (rows ?? []).map((row) => {
    const normalized = coerceStrategyEvalTickerRow(row);
    const symbol = normalized.symbol.trim().toUpperCase();
    if (!normalized.analysis) {
      return {
        symbol,
        success: false,
        error: strategyEvalRowError(normalized),
        strategies: [],
      };
    }
    const strategies = (normalized.analysis.strategyChecklist?.strategies ?? []).filter((s) =>
      allow.has((s.strategyId ?? "").trim().toLowerCase())
    );
    return { symbol, success: true, analysis: normalized.analysis, strategies };
  });
}

function filterStrategyEvalRowsBySymbols(
  rows: FinanceAiStrategyEvalTickerResult[] | undefined,
  symbols: string[]
): FinanceAiStrategyEvalTickerResult[] {
  const allow = new Set(symbols.map((s) => s.trim().toUpperCase()));
  return (rows ?? []).filter((row) => allow.has(row.symbol.trim().toUpperCase()));
}

function resolveMarketNowEvalStatus(data: FinanceAiStrategyEvalResult | null | undefined): {
  status: MarketNowEvalStatus;
  statusLabel: string;
  completedAt?: string | null;
} {
  if (!data) {
    return { status: "idle", statusLabel: "" };
  }
  if (data.status === "running") {
    return { status: "running", statusLabel: "In progress" };
  }
  if (data.status === "error" || (data.success === false && data.status !== "running")) {
    return { status: "error", statusLabel: data.error ?? "Error", completedAt: null };
  }
  if (data.status === "complete" || (Array.isArray(data.results) && data.results.length > 0)) {
    const completedAt = data.evaluatedAt ?? data.updatedAt ?? null;
    const statusLabel = completedAt
      ? `Done at ${formatFinanceAiTimestamp(completedAt)}`
      : "Done";
    return { status: "complete", statusLabel, completedAt };
  }
  return { status: "idle", statusLabel: "" };
}

function normalizeMarketNowEvalParams(params: {
  symbols: string[];
  strategyIds: string[];
  mode?: MarketNowEvaluationMode;
  tradeDate?: string;
  timeEt?: string;
}):
  | { ok: false; error: string }
  | {
      ok: true;
      symbols: string[];
      strategyIds: string[];
      tradeDate: string;
      timeEt?: string;
    } {
  if (!isFinanceAiConfigured()) {
    return { ok: false, error: "FinanceAI no configurado" };
  }

  const symbols = [...new Set(params.symbols.map((s) => s.trim().toUpperCase()).filter(Boolean))];
  const strategyIds = [...new Set(params.strategyIds.map((s) => s.trim()).filter(Boolean))];

  if (symbols.length === 0) {
    return { ok: false, error: "Selecciona al menos un ticker." };
  }
  if (strategyIds.length === 0) {
    return { ok: false, error: "Selecciona al menos una estrategia." };
  }

  const tradeDate =
    params.mode === "at" && params.tradeDate?.trim()
      ? params.tradeDate.trim()
      : tradingDateEt();
  const timeEt =
    params.mode === "at" && params.timeEt?.trim() ? params.timeEt.trim() : undefined;

  return { ok: true, symbols, strategyIds, tradeDate, timeEt };
}

export async function checkMarketNowEvaluation(params: {
  symbols: string[];
  strategyIds: string[];
}): Promise<{
  success: boolean;
  status: MarketNowEvalStatus;
  statusLabel: string;
  completedAt?: string | null;
  error?: string;
  notFound?: boolean;
  tradeDate?: string;
  timeEt?: string;
  results?: MarketNowEvaluationTickerResult[];
}> {
  const normalized = normalizeMarketNowEvalParams(params);
  if (!normalized.ok) {
    return {
      success: false,
      status: "error",
      statusLabel: "",
      error: normalized.error,
    };
  }

  const { symbols, strategyIds } = normalized;
  const fetched = await getStrategyEvalResult();
  if (!fetched.ok) {
    if (fetched.notFound) {
      return {
        success: true,
        status: "idle",
        statusLabel: "",
        notFound: true,
        results: [],
      };
    }
    return {
      success: false,
      status: "error",
      statusLabel: "",
      error: fetched.error,
    };
  }

  const filtered = filterStrategyEvalRowsBySymbols(fetched.data?.results, symbols);
  const hydrated = await hydrateStrategyEvalRows(filtered, {
    strategyIds,
    tradeDate: fetched.data?.tradeDate,
    timeEt: fetched.data?.simulationTimeEt,
  });
  const { status, statusLabel, completedAt } = resolveMarketNowEvalStatus(fetched.data);

  return {
    success: true,
    status,
    statusLabel,
    completedAt,
    tradeDate: fetched.data?.tradeDate,
    timeEt: fetched.data?.simulationTimeEt,
    results: mapStrategyEvalRows(hydrated, strategyIds),
  };
}

export async function startMarketNowEvaluation(params: {
  symbols: string[];
  strategyIds: string[];
  mode: MarketNowEvaluationMode;
  tradeDate?: string;
  timeEt?: string;
  updateBars?: boolean;
}): Promise<{
  success: boolean;
  status: MarketNowEvalStatus;
  statusLabel: string;
  completedAt?: string | null;
  error?: string;
  message?: string;
  barRequestMessage?: string;
  notFound?: boolean;
  tradeDate?: string;
  timeEt?: string;
  results?: MarketNowEvaluationTickerResult[];
}> {
  const normalized = normalizeMarketNowEvalParams(params);
  if (!normalized.ok) {
    return {
      success: false,
      status: "error",
      statusLabel: "",
      error: normalized.error,
    };
  }

  const { symbols, strategyIds, tradeDate, timeEt } = normalized;
  const updateBars = params.updateBars !== false;
  const modeLabel = params.mode === "now" ? "Now" : `${tradeDate} ${timeEt ?? ""} ET`.trim();

  const batch = await runStrategyEvalCheck({
    symbols,
    strategies: strategyIds,
    tradeDate,
    simulationTimeEt: timeEt,
    skipBars: !updateBars,
  });

  if (batch.ok) {
    const filtered = filterStrategyEvalRowsBySymbols(batch.data?.results, symbols);
    const hydrated = await hydrateStrategyEvalRows(filtered, {
      strategyIds,
      tradeDate,
      timeEt,
    });
    const results = mapStrategyEvalRows(hydrated, strategyIds);
    const { status, statusLabel, completedAt } = resolveMarketNowEvalStatus(batch.data);
    let barRequestMessage: string | undefined;
    const br = batch.data?.barRequest;
    if (br?.ran) {
      barRequestMessage = `bars · ${br.successCount ?? 0} OK${
        br.failedSymbols?.length ? ` · fallos: ${br.failedSymbols.join(", ")}` : ""
      }`;
    }

    revalidateGestion();

    const okCount = results.filter((r) => r.success).length;
    return {
      success: okCount > 0 || status === "complete",
      status,
      statusLabel,
      completedAt,
      message: `Evaluacion ${modeLabel} · tickers/check · ${okCount}/${symbols.length} ticker(s)`,
      barRequestMessage,
      tradeDate,
      timeEt,
      results,
      error:
        okCount === 0 && status !== "running"
          ? results.find((r) => r.error)?.error ?? "Ningun ticker evaluado"
          : undefined,
    };
  }

  if (!batch.notFound) {
    return {
      success: false,
      status: "error",
      statusLabel: batch.error,
      error: batch.error,
    };
  }

  const legacy = await runMarketNowEvaluationLegacy({
    symbols,
    strategyIds,
    tradeDate,
    timeEt,
    updateBars,
  });
  if (legacy.error && legacy.results.length === 0) {
    return {
      success: false,
      status: "error",
      statusLabel: legacy.error,
      error: legacy.error,
      notFound: true,
    };
  }

  revalidateGestion();

  const completedAt = new Date().toISOString();
  const okCount = legacy.results.filter((r) => r.success).length;
  return {
    success: okCount > 0,
    status: "complete",
    statusLabel: `Done at ${formatFinanceAiTimestamp(completedAt)}`,
    completedAt,
    notFound: true,
    message: `Evaluacion ${modeLabel} · check (legacy) · ${okCount}/${symbols.length} ticker(s)`,
    barRequestMessage: legacy.barRequestMessage,
    tradeDate,
    timeEt,
    results: legacy.results,
    error: okCount === 0 ? legacy.results.find((r) => r.error)?.error ?? "Ningun ticker evaluado" : undefined,
  };
}

async function runMarketNowEvaluationLegacy(params: {
  symbols: string[];
  strategyIds: string[];
  tradeDate: string;
  timeEt?: string;
  updateBars: boolean;
}): Promise<{
  results: MarketNowEvaluationTickerResult[];
  barRequestMessage?: string;
  error?: string;
}> {
  let barRequestMessage: string | undefined;
  if (params.updateBars) {
    const barResult = await triggerFinanceAiBarRequest(params.symbols, { resetBars: false });
    if (!barResult.success) {
      return { results: [], error: barResult.error ?? "bar-request falló" };
    }
    barRequestMessage = barResult.message;
  }

  const results: MarketNowEvaluationTickerResult[] = [];
  for (const symbol of params.symbols) {
    const check = await checkTicker(symbol, {
      strategies: params.strategyIds,
      tradeDate: params.tradeDate,
      ...(params.timeEt ? { simulationTimeEt: params.timeEt } : {}),
      fresh: true,
    });
    if (!check.ok) {
      results.push({ symbol, success: false, error: check.error, strategies: [] });
      continue;
    }
    const mapped = mapStrategyEvalRows(
      [{ symbol, success: true, analysis: check.data }],
      params.strategyIds
    );
    results.push(mapped[0]!);
  }
  return { results, barRequestMessage };
}

export async function runMarketNowEvaluation(params: {
  symbols: string[];
  strategyIds: string[];
  mode: MarketNowEvaluationMode;
  tradeDate?: string;
  timeEt?: string;
  updateBars?: boolean;
}): Promise<{
  success: boolean;
  error?: string;
  message?: string;
  barRequestMessage?: string;
  evaluatedAt?: string;
  tradeDate?: string;
  timeEt?: string;
  results?: MarketNowEvaluationTickerResult[];
}> {
  if (!isFinanceAiConfigured()) {
    return { success: false, error: "FinanceAI no configurado" };
  }

  const symbols = [...new Set(params.symbols.map((s) => s.trim().toUpperCase()).filter(Boolean))];
  const strategyIds = [...new Set(params.strategyIds.map((s) => s.trim()).filter(Boolean))];

  if (symbols.length === 0) {
    return { success: false, error: "Sin tickers para evaluar." };
  }
  if (strategyIds.length === 0) {
    return { success: false, error: "Selecciona al menos una estrategia." };
  }

  const tradeDate =
    params.mode === "at" && params.tradeDate?.trim()
      ? params.tradeDate.trim()
      : tradingDateEt();
  const timeEt =
    params.mode === "at" && params.timeEt?.trim() ? params.timeEt.trim() : undefined;
  const updateBars = params.updateBars !== false;

  let results: MarketNowEvaluationTickerResult[] = [];
  let barRequestMessage: string | undefined;
  let usedBatchApi = false;

  const batch = await triggerStrategyEvalFlow({
    symbols,
    strategies: strategyIds,
    tradeDate,
    simulationTimeEt: timeEt,
    fresh: true,
    skipBars: !updateBars,
  });

  if (batch.ok) {
    usedBatchApi = true;
    const hydrated = await hydrateStrategyEvalRows(batch.data.results, {
      strategyIds,
      tradeDate,
      timeEt,
    });
    results = mapStrategyEvalRows(hydrated, strategyIds);
    if (batch.data.barRequest?.ran) {
      const br = batch.data.barRequest;
      barRequestMessage = `bar-request · ${br.successCount ?? 0} OK${
        br.failedSymbols?.length ? ` · fallos: ${br.failedSymbols.join(", ")}` : ""
      }`;
    }
  } else if (batch.notFound) {
    const legacy = await runMarketNowEvaluationLegacy({
      symbols,
      strategyIds,
      tradeDate,
      timeEt,
      updateBars,
    });
    if (legacy.error && legacy.results.length === 0) {
      return { success: false, error: legacy.error };
    }
    results = legacy.results;
    barRequestMessage = legacy.barRequestMessage;
  } else {
    return { success: false, error: batch.error };
  }

  revalidateGestion();

  const okCount = results.filter((r) => r.success).length;
  const modeLabel = params.mode === "now" ? "Now" : `${tradeDate} ${timeEt ?? ""} ET`.trim();
  const apiLabel = usedBatchApi ? "tickers/check" : "check (legacy)";

  return {
    success: okCount > 0,
    message: `Evaluación ${modeLabel} · ${apiLabel} · ${okCount}/${symbols.length} ticker(s) · ${strategyIds.length} estrategia(s)`,
    barRequestMessage,
    evaluatedAt: new Date().toISOString(),
    tradeDate,
    timeEt,
    results,
    error: okCount === 0 ? results.find((r) => r.error)?.error ?? "Ningún ticker evaluado" : undefined,
  };
}

export async function runFinanceAiPremarket(
  symbol: string,
  mode: "full" | "now" | "refresh"
): Promise<FinanceAiActionResult & { analysis?: FinanceAiPremarketAnalysis }> {
  if (!isFinanceAiConfigured()) return configError();
  const result = await runPremarket(symbol.toUpperCase(), mode);
  if (!result.ok) return { success: false, error: result.error };
  if (result.accepted) {
    return {
      success: true,
      message: "Pre-market iniciado — consultando AWS…",
      analysis: { ...result.data, status: "running" },
    };
  }
  revalidateGestion();
  const data = result.data;
  return {
    success: true,
    message: `Pre-market ${mode} · bias ${data.bias ?? "—"} · rev ${data.revision ?? 1}`,
    updatedAt: data.updatedAt,
    analysis: data,
  };
}

/** Read stored post-market row only (GET). Does not run POST / postmarket analysis. */
export async function fetchFinanceAiPostmarket(
  symbol: string
): Promise<{ success: boolean; analysis?: FinanceAiPostmarketAnalysis; error?: string }> {
  if (!isFinanceAiConfigured()) {
    return { success: false, error: "FinanceAI no configurado" };
  }
  const result = await getPostmarket(symbol.toUpperCase());
  if (!result.ok) return { success: false, error: result.error };
  return { success: true, analysis: result.data };
}

export async function runFinanceAiPostmarket(
  symbol: string
): Promise<FinanceAiActionResult & { analysis?: FinanceAiPostmarketAnalysis }> {
  if (!isFinanceAiConfigured()) return configError();
  const result = await runPostmarket(symbol.toUpperCase());
  if (!result.ok) return { success: false, error: result.error };
  if (result.accepted) {
    return {
      success: true,
      message: "Post-market iniciado — consultando AWS…",
      analysis: { ...result.data, status: "running" },
    };
  }
  revalidateGestion();
  const data = result.data;
  return {
    success: true,
    message: `Post-market · ${data.report?.primaryVerdict ?? "listo"} · ${data.outcomes?.achievementPct ?? 0}% estrategias`,
    updatedAt: data.updatedAt,
    analysis: data,
  };
}

export async function fetchFinanceAiPostmarketStats(): Promise<{
  success: boolean;
  stats?: FinanceAiPostmarketStats;
  error?: string;
}> {
  if (!isFinanceAiConfigured()) {
    return { success: false, error: "FinanceAI no configurado" };
  }
  const result = await getPostmarketStats();
  if (!result.ok) return { success: false, error: result.error };
  return { success: true, stats: result.data };
}

export async function fetchFinanceAiNowPollingStatus(): Promise<{
  success: boolean;
  status?: FinanceAiNowPollingStatus;
  error?: string;
}> {
  if (!isFinanceAiConfigured()) {
    return { success: false, error: "FinanceAI no configurado" };
  }
  const result = await getNowPollingStatus();
  if (!result.ok) return { success: false, error: result.error };
  return { success: true, status: result.data };
}

export async function fetchFinanceAiRecentAlerts(): Promise<{
  success: boolean;
  alerts?: FinanceAiStrategyAlert[];
  updatedAt?: string;
  alertsEnabled?: boolean;
  error?: string;
}> {
  if (!isFinanceAiConfigured()) {
    return { success: false, error: "FinanceAI no configurado" };
  }
  const result = await getRecentAlerts(30);
  if (!result.ok) return { success: false, error: result.error };
  return {
    success: true,
    alerts: result.data.alerts ?? [],
    updatedAt: result.data.updatedAt ?? undefined,
    alertsEnabled: result.data.alertsEnabled,
  };
}

export async function fetchFinanceAiAlertsSettings(): Promise<{
  success: boolean;
  alertsEnabled?: boolean;
  updatedAt?: string | null;
  error?: string;
}> {
  if (!isFinanceAiConfigured()) {
    return { success: false, error: "FinanceAI no configurado" };
  }
  const result = await getAlertsSettings();
  if (!result.ok) return { success: false, error: result.error };
  return {
    success: true,
    alertsEnabled: result.data.alertsEnabled,
    updatedAt: result.data.updatedAt,
  };
}

export async function setFinanceAiAlertsEnabled(enabled: boolean): Promise<{
  success: boolean;
  alertsEnabled?: boolean;
  updatedAt?: string | null;
  error?: string;
}> {
  if (!isFinanceAiConfigured()) {
    return { success: false, error: "FinanceAI no configurado" };
  }
  const result = await putAlertsSettings(enabled);
  if (!result.ok) return { success: false, error: result.error };
  return {
    success: true,
    alertsEnabled: result.data.alertsEnabled,
    updatedAt: result.data.updatedAt,
  };
}

export async function fetchFinanceAiMov15mStatusSummary(): Promise<{
  success: boolean;
  lastRunAt?: string;
  lastRunPhase?: string;
  phase?: string;
  error?: string;
}> {
  if (!isFinanceAiConfigured()) {
    return { success: false, error: "FinanceAI no configurado" };
  }
  const result = await getMov15mStatusSummary();
  if (!result.ok) return { success: false, error: result.error };
  return {
    success: true,
    lastRunAt: result.data.lastRunAt,
    lastRunPhase: result.data.lastRunPhase,
    phase: result.data.phase,
  };
}

export async function fetchFinanceAiMov15mStatus(options?: {
  persist?: boolean;
}): Promise<{
  success: boolean;
  status?: FinanceAiBolinger15FastMovementStatus;
  error?: string;
}> {
  if (!isFinanceAiConfigured()) {
    return { success: false, error: "FinanceAI no configurado" };
  }
  const result = await getMov15mStatus();
  if (!result.ok) return { success: false, error: result.error };
  if (options?.persist) {
    await persistMov15mStatus(result.data);
    const pool = result.data.tickersToday15M;
    if (pool?.symbols?.length && pool.tradeDate) {
      await persistTickersToday15mPool(pool.symbols, pool.tradeDate).catch(() => undefined);
    } else if (result.data.watchlistSource === "tickersToday15M" && result.data.watchlist?.length) {
      const td = result.data.tradeDate ?? result.data.effectiveTradeDate ?? "";
      if (td) {
        await persistTickersToday15mPool(result.data.watchlist, td).catch(() => undefined);
      }
    }
  }
  return { success: true, status: result.data };
}

export async function triggerFinanceAiMov15mCheck(options?: {
  mode?: "full_assessment_inside_b15m" | "premarket_now" | "in_market_now" | "post_market_now" | "full_assessment";
  manual?: boolean;
  tradeDate?: string;
  fresh?: boolean;
  simulateMinutesEt?: number;
  symbols?: string[];
  poll1m?: boolean;
  pollingStartTimeEt?: string;
  pollingEndTimeEt?: string;
  tickersForPolling?: string[];
}): Promise<{
  success: boolean;
  status?: FinanceAiBolinger15FastMovementStatus;
  phase?: string;
  error?: string;
  accepted?: boolean;
  baselineLastRunAt?: string;
}> {
  if (!isFinanceAiConfigured()) {
    return { success: false, error: "FinanceAI no configurado" };
  }
  const mode = options?.poll1m
    ? "full_assessment_inside_b15m"
    : options?.mode ?? "full_assessment_inside_b15m";
  const baseline = await loadPersistedMov15mStatus();
  const baselineLastRunAt = baseline.status?.lastRunAt;

  const tick = await postMov15mTick({
    force: true,
    async: true,
    manual: options?.manual !== false,
    fresh: options?.fresh === true,
    mode,
    tradeDate: options?.tradeDate,
    simulateMinutesEt: options?.simulateMinutesEt,
    symbols: options?.symbols ?? options?.tickersForPolling,
    poll1m: options?.poll1m,
    pollingStartTimeEt: options?.pollingStartTimeEt,
    pollingEndTimeEt: options?.pollingEndTimeEt,
    tickersForPolling: options?.tickersForPolling,
  });
  if (!tick.ok) {
    return {
      success: false,
      error:
        tick.error.includes("timed out") ||
        tick.error.includes("503") ||
        tick.error.includes("504")
          ? `${tick.error} — redeploy FinanceAI Lambda (async mov15m tick + self-invoke IAM).`
          : tick.error,
    };
  }

  if (tick.data.skipped === true) {
    const msg =
      (typeof tick.data.message === "string" && tick.data.message) ||
      (typeof tick.data.error === "string" && tick.data.error) ||
      "Evaluación omitida";
    return { success: false, error: msg };
  }

  if (tick.data.accepted === true) {
    return {
      success: true,
      accepted: true,
      baselineLastRunAt,
      phase: mode,
    };
  }

  const tickStatus = tick.data.status as FinanceAiBolinger15FastMovementStatus | undefined;
  if (tickStatus?.tickers) {
    await persistMov15mStatus(tickStatus);
    return {
      success: true,
      status: tickStatus,
      phase: typeof tick.data.phase === "string" ? tick.data.phase : undefined,
    };
  }
  const status = await getMov15mStatus();
  if (!status.ok) {
    return {
      success: false,
      error: status.error,
    };
  }
  await persistMov15mStatus(status.data);
  return {
    success: true,
    status: status.data,
    phase: typeof tick.data.phase === "string" ? tick.data.phase : undefined,
  };
}

export async function submitFinanceAiMov15mTradingOrder(payload: {
  symbol: string;
  side: "buy" | "sell" | "sell_now" | "force_sell";
  optionType?: "CALL" | "PUT";
  direction?: string;
  quantity?: number;
  buyOrderId?: string;
}): Promise<{
  success: boolean;
  result?: FinanceAiTradingOrderResult;
  error?: string;
}> {
  if (!isFinanceAiConfigured()) {
    return { success: false, error: "FinanceAI no configurado" };
  }
  const response = await postMov15mTradingOrder(payload);
  if (!response.ok) return { success: false, error: response.error };
  return { success: true, result: response.data };
}

export async function fetchFinanceAiMov15mOrderStatus(
  buyOrderId: string,
  params?: { sellOrderId?: string; spotPrice?: number }
): Promise<{
  success: boolean;
  status?: import("@/server/services/finance-ai-client").FinanceAiTradingPositionStatus;
  error?: string;
}> {
  if (!isFinanceAiConfigured()) {
    return { success: false, error: "FinanceAI no configurado" };
  }
  const response = await getMov15mOrderStatus(buyOrderId, params);
  if (!response.ok) return { success: false, error: response.error };
  return { success: true, status: response.data };
}

export async function fetchFinanceAiMov15mOrderFill(orderId: string): Promise<{
  success: boolean;
  fill?: FinanceAiTradingOrderFillStatus;
  error?: string;
}> {
  if (!isFinanceAiConfigured()) {
    return { success: false, error: "FinanceAI no configurado" };
  }
  const response = await getMov15mOrderFill(orderId);
  if (!response.ok) return { success: false, error: response.error };
  return { success: true, fill: response.data };
}

export async function fetchFinanceAiMov15mOrders(symbol: string): Promise<{
  success: boolean;
  orders?: import("@/server/services/finance-ai-client").FinanceAiTradingOrderSummary[];
  error?: string;
}> {
  if (!isFinanceAiConfigured()) {
    return { success: false, error: "FinanceAI no configurado" };
  }
  const response = await getMov15mOrdersBySymbol(symbol);
  if (!response.ok) return { success: false, error: response.error };
  return { success: true, orders: response.data.orders ?? [] };
}

export async function cancelFinanceAiMov15mOrder(orderId: string): Promise<{
  success: boolean;
  order?: import("@/server/services/finance-ai-client").FinanceAiTradingOrderSummary;
  error?: string;
}> {
  if (!isFinanceAiConfigured()) {
    return { success: false, error: "FinanceAI no configurado" };
  }
  const response = await cancelMov15mOrder(orderId);
  if (!response.ok) return { success: false, error: response.error };
  return { success: true, order: response.data.order };
}

export async function editFinanceAiMov15mOrderLimit(
  orderId: string,
  price: number
): Promise<{
  success: boolean;
  order?: import("@/server/services/finance-ai-client").FinanceAiTradingOrderSummary;
  error?: string;
}> {
  if (!isFinanceAiConfigured()) {
    return { success: false, error: "FinanceAI no configurado" };
  }
  const response = await patchMov15mOrderLimit(orderId, price);
  if (!response.ok) return { success: false, error: response.error };
  return { success: true, order: response.data.order };
}

export async function fetchFinanceAiStrategyMetStatus(): Promise<{
  success: boolean;
  status?: FinanceAiStrategyMetStatus;
  error?: string;
}> {
  if (!isFinanceAiConfigured()) {
    return { success: false, error: "FinanceAI no configurado" };
  }
  const result = await getStrategyMetStatus();
  if (!result.ok) return { success: false, error: result.error };
  return { success: true, status: result.data };
}

export async function runFinanceAiNowIntake(
  symbol: string
): Promise<{ success: boolean; analysis?: FinanceAiPremarketAnalysis; error?: string }> {
  if (!isFinanceAiConfigured()) {
    return { success: false, error: "FinanceAI no configurado" };
  }
  const result = await runNowAssessment(symbol.toUpperCase());
  if (!result.ok) return { success: false, error: result.error };
  revalidateGestion();
  return { success: true, analysis: result.data };
}

export async function runFinanceAiNowAiAssessment(
  symbol: string
): Promise<{ success: boolean; analysis?: FinanceAiPremarketAnalysis; error?: string }> {
  if (!isFinanceAiConfigured()) {
    return { success: false, error: "FinanceAI no configurado" };
  }
  const result = await runNowAiAssessment(symbol.toUpperCase());
  if (!result.ok) return { success: false, error: result.error };
  revalidateGestion();
  return { success: true, analysis: result.data };
}

export async function recomputeFinanceAiTickersNow(
  symbols?: string[],
  options?: { source?: string }
): Promise<{
  success: boolean;
  tickersNow?: FinanceAiTickersNow;
  error?: string;
  message?: string;
}> {
  if (!isFinanceAiConfigured()) {
    return { success: false, error: "FinanceAI no configurado" };
  }
  const tradeDate = effectiveTradingDateEt();
  const result = await recomputeTickersNow({
    symbols,
    tradeDate,
    source: options?.source ?? "adhoc",
  });
  if (!result.ok) return { success: false, error: result.error };
  const { persistTickersTodayPool } = await import("@/server/actions/tickers");
  const td = result.data.tradeDate ?? tradeDate;
  if (result.data.symbols?.length) {
    await persistTickersTodayPool(result.data.symbols, td);
  }
  revalidateGestion();
  const count = result.data.symbols?.length ?? 0;
  return {
    success: true,
    tickersNow: result.data,
    message:
      options?.source === "premarket_assessment"
        ? `TickersToday — ${count} ticker(s) tras PRE (≥50% checklist)`
        : undefined,
  };
}

export async function runFinanceAiManualPrecheckTickersToday(options?: {
  symbols?: string[];
  force?: boolean;
}): Promise<{
  success: boolean;
  tickersNow?: FinanceAiTickersNow;
  error?: string;
  message?: string;
}> {
  if (!isFinanceAiConfigured()) {
    return { success: false, error: "FinanceAI no configurado" };
  }
  const result = await manualPrecheckTickersNow({
    symbols: options?.symbols,
    tradeDate: effectiveTradingDateEt(),
    force: options?.force,
  });
  if (!result.ok) return { success: false, error: result.error };
  const { persistTickersTodayPool } = await import("@/server/actions/tickers");
  const td = result.data.tradeDate ?? effectiveTradingDateEt();
  if (result.data.symbols?.length) {
    await persistTickersTodayPool(result.data.symbols, td);
  }
  revalidateGestion();
  const count = result.data.symbols?.length ?? 0;
  return {
    success: true,
    tickersNow: result.data,
    message: `TickersToday — ${count} ticker(s) tras precheck manual (≥50% checklist)`,
  };
}

export async function runFinanceAiNowIntakeBatch(
  symbols?: string[],
  options?: { journeyManual?: boolean }
): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  ok?: number;
  total?: number;
}> {
  if (!isFinanceAiConfigured()) {
    return { success: false, error: "FinanceAI no configurado" };
  }
  const result = await runNowIntakeBatch(symbols, {
    manualIntake: options?.journeyManual !== false,
    source: options?.journeyManual ? "journey_manual" : "adhoc",
  });
  if (!result.ok) return { success: false, error: result.error };
  revalidateGestion();
  const data = result.data;
    return {
      success: Boolean(data.success),
      message: data.success
        ? `NOW manual · ${data.successCount ?? 0}/${data.total ?? 0} TickersToday · sin polling automático`
        : undefined,
    error: data.error,
    ok: data.successCount,
    total: data.total,
  };
}

export async function fetchJourneyBubbleStatus(): Promise<{
  success: boolean;
  checkedAt?: string;
  tradeDate?: string;
  nowPolling?: FinanceAiNowPollingStatus;
  tickersNow?: FinanceAiTickersNow | null;
  postmarketStats?: FinanceAiPostmarketStats | null;
  error?: string;
}> {
  if (!isFinanceAiConfigured()) {
    return { success: false, error: "FinanceAI no configurado" };
  }
  const tradeDate = effectiveTradingDateEt();

  const [nowResult, postStatsResult, schedulesResult] = await Promise.all([
    getNowPollingStatus(),
    getPostmarketStats(),
    getScheduleSettings(),
  ]);

  if (!nowResult.ok) {
    return { success: false, error: nowResult.error };
  }

  const postmarketStats =
    postStatsResult.ok && postStatsResult.data?.lastTradeDate === tradeDate
      ? postStatsResult.data
      : null;

  const tickersNow =
    schedulesResult.ok && schedulesResult.data.tickersNow?.tradeDate === tradeDate
      ? schedulesResult.data.tickersNow
      : null;

  return {
    success: true,
    checkedAt: new Date().toISOString(),
    tradeDate,
    nowPolling: nowResult.data,
    tickersNow,
    postmarketStats,
  };
}

/** @deprecated Journey CheckStatus uses fetchJourneyBubbleStatus — panels load detail via Actualizar. */
export async function fetchMarketAiJourneyStatus(
  _symbols: string[],
  _options?: {
    includePostmarket?: boolean;
    flowsOnly?: boolean;
  }
): Promise<{
  success: boolean;
  checkedAt?: string;
  tradeDate?: string;
  nowPolling?: FinanceAiNowPollingStatus;
  tickersNow?: FinanceAiTickersNow | null;
  postmarketBySymbol?: Record<string, FinanceAiPostmarketAnalysis | null>;
  premarketBySymbol?: Record<string, FinanceAiPremarketAnalysis | null>;
  postmarketStats?: FinanceAiPostmarketStats | null;
  error?: string;
}> {
  const bubble = await fetchJourneyBubbleStatus();
  if (!bubble.success) return bubble;
  return {
    ...bubble,
    premarketBySymbol: {},
    postmarketBySymbol: {},
  };
}

export async function enrollFinanceAiNow(
  symbol: string,
  enabled: boolean
): Promise<FinanceAiActionResult> {
  if (!isFinanceAiConfigured()) return configError();
  const result = await enrollNow(symbol.toUpperCase(), enabled);
  if (!result.ok) return { success: false, error: result.error };
  return {
    success: true,
    message: enabled ? "NOW manual inscrito en AWS (15 min)" : "NOW manual detenido en AWS",
  };
}

function manualNowSymbolsFromStatus(status: FinanceAiNowPollingStatus | undefined): string[] {
  const symbols = new Set<string>();
  for (const sym of status?.manualEnrolled ?? []) {
    if (sym?.trim()) symbols.add(sym.trim().toUpperCase());
  }
  if (status?.tickers) {
    for (const [sym, row] of Object.entries(status.tickers)) {
      if (row.manualNow) symbols.add(sym.toUpperCase());
    }
  }
  return [...symbols];
}

/** Unenroll manual NOW on AWS and clear local live-eligible watch flags. */
export async function stopFinanceAiNowSession(): Promise<FinanceAiActionResult> {
  if (!isFinanceAiConfigured()) return configError();

  const poll = await getNowPollingStatus();
  if (!poll.ok) return { success: false, error: poll.error };

  const symbols = new Set(manualNowSymbolsFromStatus(poll.data));
  const gestionRows = await listTickersForGestion();
  for (const row of gestionRows) {
    if (row.financeAiLiveEligible) {
      symbols.add(row.symbol.toUpperCase());
    }
  }

  let unenrolled = 0;
  for (const sym of symbols) {
    const result = await enrollNow(sym, false);
    if (result.ok) unenrolled += 1;
  }

  const clearedWatch = await clearAllTickerLiveWatching();
  revalidatePath(MARKET_PATH);

  if (unenrolled === 0 && clearedWatch === 0) {
    return { success: true, message: "NOW ya estaba detenido (sin inscripciones ni watch local)." };
  }

  const parts: string[] = [];
  if (unenrolled > 0) parts.push(`${unenrolled} inscripción(es) AWS`);
  if (clearedWatch > 0) parts.push(`${clearedWatch} watch local`);
  return { success: true, message: `NOW detenido · ${parts.join(" · ")}` };
}
