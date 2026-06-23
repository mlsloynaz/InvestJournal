"use server";

import { revalidatePath } from "next/cache";
import type {
  FinanceAiBolinger15FastMovementStatus,
  FinanceAiNowGroupsPayload,
} from "@/lib/finance-ai-types";
import {
  FinanceAiConfigError,
  getDailyMaintenanceDetail,
  getScheduleSettings,
  isFinanceAiConfigured,
  putScheduleSettings,
  refreshDailyMaintenance,
  type FinanceAiDailyMaintenanceResult,
  type FinanceAiDailyMaintenanceStatus,
  type FinanceAiScheduleSettings,
} from "@/server/services/finance-ai-client";
import { listBolinger15Symbols, listFavoriteSymbols, setBolinger15Tickers } from "@/server/actions/tickers";
import {
  getEvaluateStrategySettings,
  saveEvaluateStrategyIdsToMysql,
} from "@/server/actions/evaluate-strategy-settings";
import {
  normalizeEvaluateStrategyIds,
  schedulePreservePayloadFromSettings,
} from "@/lib/evaluate-strategy-ids";
import { prisma } from "@/lib/db";

export type FinanceAiScheduleActionResult = {
  success: boolean;
  error?: string;
  settings?: FinanceAiScheduleSettings;
};

export async function getFinanceAiScheduleSettings(): Promise<FinanceAiScheduleActionResult> {
  if (!isFinanceAiConfigured()) {
    return { success: false, error: "FinanceAI no configurado (FINANCE_AI_API_URL / KEY)." };
  }
  try {
    const result = await getScheduleSettings();
    if (!result.ok) return { success: false, error: result.error };
    return { success: true, settings: result.data };
  } catch (e) {
    return {
      success: false,
      error: e instanceof FinanceAiConfigError ? e.message : "Error leyendo schedules.",
    };
  }
}

export async function setFinanceAiScheduledJobsEnabled(
  enabled: boolean
): Promise<FinanceAiScheduleActionResult> {
  if (!isFinanceAiConfigured()) {
    return { success: false, error: "FinanceAI no configurado." };
  }
  const favorites = await listFavoriteSymbols();
  const result = await putScheduleSettings({
    scheduledJobsEnabled: enabled,
    symbols: favorites,
    watchlistSource: "investjournal",
  });
  if (!result.ok) return { success: false, error: result.error };
  revalidateSchedulePaths();
  return { success: true, settings: result.data };
}

export async function syncFinanceAiWatchlistFromFavorites(): Promise<FinanceAiScheduleActionResult> {
  if (!isFinanceAiConfigured()) {
    return { success: false, error: "FinanceAI no configurado." };
  }
  const favorites = await listFavoriteSymbols();
  if (favorites.length === 0) {
    return { success: false, error: "Sin favoritos — marca ★ en Tickers." };
  }
  const result = await putScheduleSettings({
    symbols: favorites,
    watchlistSource: "investjournal-favorites",
  });
  if (!result.ok) return { success: false, error: result.error };
  revalidateSchedulePaths();
  return { success: true, settings: result.data };
}

export async function syncFinanceAiWatchlistFromBolinger15(): Promise<FinanceAiScheduleActionResult> {
  if (!isFinanceAiConfigured()) {
    return { success: false, error: "FinanceAI no configurado." };
  }
  try {
    const bb15 = await listBolinger15Symbols();
    if (bb15.length === 0) {
      return {
        success: false,
        error: "Sin tickers Movimiento 15M — márcalos en Tickers → Movimiento 15M.",
      };
    }
    const result = await putScheduleSettings({
      symbols: bb15,
      watchlistSource: "investjournal-bb15",
    });
    if (!result.ok) return { success: false, error: result.error };
    revalidateSchedulePaths();
    return { success: true, settings: result.data };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Error sincronizando Movimiento 15M.",
    };
  }
}

function revalidateSchedulePaths() {
  revalidatePath("/config");
  revalidatePath("/config/aws");
  revalidatePath("/config/tickers");
  revalidatePath("/market");
}

export async function setFinanceAiScheduleRuleEnabled(
  ruleName: string,
  enabled: boolean
): Promise<FinanceAiScheduleActionResult> {
  if (!isFinanceAiConfigured()) {
    return { success: false, error: "FinanceAI no configurado." };
  }
  const result = await putScheduleSettings({
    ruleName,
    ruleEnabled: enabled,
  });
  if (!result.ok) return { success: false, error: result.error };
  revalidateSchedulePaths();
  return { success: true, settings: result.data };
}

export async function setFinanceAiNowAutomaticPollingEnabled(
  enabled: boolean
): Promise<FinanceAiScheduleActionResult> {
  if (!isFinanceAiConfigured()) {
    return { success: false, error: "FinanceAI no configurado." };
  }
  const result = await putScheduleSettings({ nowAutomaticPollingEnabled: enabled });
  if (!result.ok) return { success: false, error: result.error };
  revalidateSchedulePaths();
  return { success: true, settings: result.data };
}

export async function setFinanceAiBuySellEnabled(
  enabled: boolean
): Promise<FinanceAiScheduleActionResult> {
  if (!isFinanceAiConfigured()) {
    return { success: false, error: "FinanceAI no configurado." };
  }
  const result = await putScheduleSettings({ buySellEnabled: enabled });
  if (!result.ok) return { success: false, error: result.error };
  revalidateSchedulePaths();
  return { success: true, settings: result.data };
}

export async function setFinanceAiBuySellTickers(
  symbols: string[]
): Promise<FinanceAiScheduleActionResult> {
  if (!isFinanceAiConfigured()) {
    return { success: false, error: "FinanceAI no configurado." };
  }
  const normalized = parseTickerSymbolsInput(symbols.join(","));
  const result = await putScheduleSettings({
    buySellTickers: normalized,
    buySellTickersSource: "investjournal",
  });
  if (!result.ok) return { success: false, error: result.error };
  revalidateSchedulePaths();
  return { success: true, settings: result.data };
}

export async function syncFinanceAiBuySellTickersFromBolinger15(): Promise<FinanceAiScheduleActionResult> {
  if (!isFinanceAiConfigured()) {
    return { success: false, error: "FinanceAI no configurado." };
  }
  try {
    const bb15 = await listBolinger15Symbols();
    if (bb15.length === 0) {
      return {
        success: false,
        error: "Sin tickers Movimiento 15M — márcalos en Tickers → Movimiento 15M.",
      };
    }
    const result = await putScheduleSettings({
      buySellTickers: bb15,
      buySellTickersSource: "investjournal-bb15",
    });
    if (!result.ok) return { success: false, error: result.error };
    revalidateSchedulePaths();
    return { success: true, settings: result.data };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Error sincronizando Buy/Sell tickers.",
    };
  }
}

function parseTickerSymbolsInput(raw: string): string[] {
  const parts = raw
    .split(/[\s,;]+/)
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
  return [...new Set(parts)];
}

export async function setFinanceAiEvaluateStrategyIds(
  strategyIds: string[]
): Promise<FinanceAiScheduleActionResult & { awsWarning?: string }> {
  const snapshot = isFinanceAiConfigured() ? await getEvaluateStrategySettings() : null;
  const catalogIds = snapshot?.catalog.map((row) => row.id) ?? [];
  const normalized = normalizeEvaluateStrategyIds(strategyIds, catalogIds);
  if (normalized.length === 0) {
    return { success: false, error: "Selecciona al menos una estrategia válida (e01–e05)." };
  }

  await saveEvaluateStrategyIdsToMysql(normalized);

  if (!isFinanceAiConfigured()) {
    revalidateSchedulePaths();
    return { success: true };
  }

  const current = await getScheduleSettings();
  const preserve =
    current.ok && current.data
      ? schedulePreservePayloadFromSettings(current.data)
      : { scheduledJobsEnabled: true };

  const result = await putScheduleSettings({
    ...preserve,
    evaluateStrategyIds: normalized,
    evaluateStrategyIdsSource: "investjournal-market-ai",
  });

  revalidateSchedulePaths();

  if (!result.ok) {
    return {
      success: true,
      awsWarning: result.error,
      settings: current.ok ? current.data : undefined,
    };
  }

  return { success: true, settings: result.data };
}

export async function setFinanceAiBolinger15Tickers(
  symbols: string[]
): Promise<FinanceAiScheduleActionResult> {
  const normalized = parseTickerSymbolsInput(symbols.join(","));
  if (normalized.length === 0) {
    return { success: false, error: "Indica al menos un ticker válido." };
  }

  await setBolinger15Tickers(normalized);

  if (!isFinanceAiConfigured()) {
    return { success: true };
  }

  const result = await putScheduleSettings({
    bolinger15Tickers: normalized,
    bolinger15TickersSource: "investjournal",
  });
  if (!result.ok) return { success: false, error: result.error };
  revalidateSchedulePaths();
  return { success: true, settings: result.data };
}

export async function syncFinanceAiBolinger15TickersFromAllConfigured(): Promise<FinanceAiScheduleActionResult> {
  if (!isFinanceAiConfigured()) {
    return { success: false, error: "FinanceAI no configurado." };
  }
  const rows = await prisma.ticker.findMany({
    select: { symbol: true },
    orderBy: { symbol: "asc" },
  });
  const symbols = rows.map((r) => r.symbol);
  if (symbols.length === 0) {
    return { success: false, error: "Sin tickers en MySQL." };
  }
  const result = await putScheduleSettings({
    bolinger15Tickers: symbols,
    bolinger15TickersSource: "investjournal-all",
  });
  if (!result.ok) return { success: false, error: result.error };
  revalidateSchedulePaths();
  return { success: true, settings: result.data };
}

export async function syncFinanceAiBolinger15TickersFromFavorites(): Promise<FinanceAiScheduleActionResult> {
  if (!isFinanceAiConfigured()) {
    return { success: false, error: "FinanceAI no configurado." };
  }
  const favorites = await listFavoriteSymbols();
  if (favorites.length === 0) {
    return { success: false, error: "Sin favoritos — marca ★ en Tickers." };
  }
  const result = await putScheduleSettings({
    bolinger15Tickers: favorites,
    bolinger15TickersSource: "investjournal",
  });
  if (!result.ok) return { success: false, error: result.error };
  revalidateSchedulePaths();
  return { success: true, settings: result.data };
}

export type FinanceAiDailyMaintenanceActionResult = {
  success: boolean;
  error?: string;
  status?: FinanceAiDailyMaintenanceStatus;
  settings?: FinanceAiScheduleSettings;
};

export type MorningScheduleReadinessResult = {
  success: boolean;
  error?: string;
  checkedAt?: string;
  scheduledJobsEnabled?: boolean;
  dailyMaintenance?: FinanceAiDailyMaintenanceStatus | null;
  nowGroups?: FinanceAiNowGroupsPayload | null;
  pre930Readiness?: FinanceAiDailyMaintenanceResult["pre930Readiness"];
  dataPreparation?: FinanceAiBolinger15FastMovementStatus["dataPreparation"];
};

/** One-shot morning check: 1 AM Recopilar + BB15 15m readiness + TickersToday/NOW pools. */
export async function fetchMorningScheduleReadiness(): Promise<MorningScheduleReadinessResult> {
  if (!isFinanceAiConfigured()) {
    return { success: false, error: "FinanceAI no configurado." };
  }
  try {
    const [schedules, maintenance] = await Promise.all([
      getScheduleSettings(),
      getDailyMaintenanceDetail(),
    ]);
    if (!schedules.ok) return { success: false, error: schedules.error };
    if (!maintenance.ok) return { success: false, error: maintenance.error };

    const pre930 = maintenance.data.result?.pre930Readiness ?? null;
    const dataPreparation = pre930
      ? {
          ready: pre930.dataReady,
          summary: pre930.summary,
          notReadySymbols: pre930.notReadySymbols,
          checkedAt: pre930.checkedAt,
          globalIssues: pre930.globalIssues,
          symbolCount: pre930.symbolCount,
          readyCount: pre930.readyCount,
        }
      : null;

    return {
      success: true,
      checkedAt: new Date().toISOString(),
      scheduledJobsEnabled: schedules.data.scheduledJobsEnabled,
      dailyMaintenance: schedules.data.dailyMaintenance ?? maintenance.data.dailyMaintenance ?? null,
      nowGroups: schedules.data.nowGroups ?? null,
      pre930Readiness: pre930,
      dataPreparation,
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof FinanceAiConfigError ? e.message : "Error consultando schedulers nocturnos.",
    };
  }
}

export async function triggerFinanceAiDailyMaintenance(): Promise<FinanceAiDailyMaintenanceActionResult> {
  if (!isFinanceAiConfigured()) {
    return { success: false, error: "FinanceAI no configurado." };
  }
  const result = await refreshDailyMaintenance();
  if (!result.ok) {
    return { success: false, error: result.error };
  }
  await syncFinanceAiBolinger15TickersFromAllConfigured().catch(() => undefined);
  const settings = await getScheduleSettings();
  revalidateSchedulePaths();
  return {
    success: true,
    status: result.data,
    settings: settings.ok ? settings.data : undefined,
  };
}
