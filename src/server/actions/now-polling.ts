"use server";

import { prisma } from "@/lib/db";
import { isNowPollingWindowEt, tradingDateEt } from "@/lib/live-session-window";
import {
  DEFAULT_NOW_POLLING_SESSION,
  isNowPollDue,
  mergeNowPollingSession,
  normalizeNowPollInterval,
  nowPollIntervalFromDb,
  nowPollIntervalMinutes,
  nowPollIntervalToDb,
  type NowPollIntervalSelection,
  type NowPollingSession,
} from "@/lib/now-polling-session";
import { MARKET_PATH } from "@/lib/tools-paths";
import { revalidatePath } from "next/cache";
import { checkAndPersistMarketAiJourney, loadPersistedMarketAiJourney } from "@/server/actions/market-ai-journey";
import { runFinanceAiNowIntake } from "@/server/actions/finance-ai";
import { resolveTickersNowSymbols } from "@/lib/tickers-now";
import { isFinanceAiConfigured } from "@/server/services/finance-ai-client";
import { listTickersForGestion } from "@/server/actions/tickers";
import {
  type PersistedMarketAiJourney,
} from "@/lib/market-ai-journey-persist";

const SNAPSHOT_ROW_ID = 1;

export type NowPollTickerConfig = {
  symbol: string;
  name: string | null;
  status: string | null;
  pollInterval: NowPollIntervalSelection;
  lastPollAt: string | null;
  premarketDate: string | null;
};

async function loadJourneySnapshotRaw(): Promise<PersistedMarketAiJourney | null> {
  return loadPersistedMarketAiJourney();
}

async function saveNowPollingSession(session: NowPollingSession): Promise<void> {
  const existing = await loadJourneySnapshotRaw();
  const tradeDate = tradingDateEt();
  const merged: PersistedMarketAiJourney = existing ?? {
    aws: {
      checkedAt: new Date().toISOString(),
      tradeDate,
      premarketBySymbol: {},
      postmarketBySymbol: {},
    },
    stepStatuses: {} as PersistedMarketAiJourney["stepStatuses"],
    processControl: { now: "off", post: "off" },
  };
  merged.nowPolling = session;
  await prisma.marketAiJourneySnapshot.upsert({
    where: { id: SNAPSHOT_ROW_ID },
    create: {
      id: SNAPSHOT_ROW_ID,
      tradeDate,
      checkedAt: new Date(),
      snapshotJson: JSON.stringify(merged),
    },
    update: {
      tradeDate,
      checkedAt: new Date(),
      snapshotJson: JSON.stringify(merged),
    },
  });
  revalidatePath(MARKET_PATH);
}

export async function loadNowPollingConfig(): Promise<{
  success: boolean;
  session?: NowPollingSession;
  tickers?: NowPollTickerConfig[];
  error?: string;
}> {
  try {
    const rows = await listTickersForGestion();
    const journey = await loadJourneySnapshotRaw();
    const session = mergeNowPollingSession(journey?.nowPolling);
    const tickers: NowPollTickerConfig[] = rows.map((t) => ({
      symbol: t.symbol,
      name: t.name,
      status: t.financeAiStatus,
      pollInterval: nowPollIntervalFromDb(t.financeAiNowPollInterval),
      lastPollAt: t.financeAiNowLastPollAt?.toISOString() ?? null,
      premarketDate: t.financeAiPremarketDate,
    }));
    return { success: true, session, tickers };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "No se pudo cargar configuración NOW",
    };
  }
}

export async function setTickerNowPollInterval(
  symbol: string,
  pollInterval: NowPollIntervalSelection
): Promise<{ success: boolean; error?: string }> {
  const sym = symbol.trim().toUpperCase();
  const interval = normalizeNowPollInterval(pollInterval);
  try {
    await prisma.ticker.update({
      where: { symbol: sym },
      data: { financeAiNowPollInterval: nowPollIntervalToDb(interval) },
    });
    revalidatePath(MARKET_PATH);
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "No se pudo guardar intervalo",
    };
  }
}

async function markTickerPolled(symbol: string): Promise<void> {
  await prisma.ticker.update({
    where: { symbol: symbol.trim().toUpperCase() },
    data: { financeAiNowLastPollAt: new Date() },
  });
}

/** Immediate POST /context/now/intake for TickersNow (≥50% PRE). */
export async function runNowIntakeForFavorites(): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  ok?: number;
  failed?: number;
}> {
  if (!isFinanceAiConfigured()) {
    return { success: false, error: "FinanceAI no configurado" };
  }

  const { runFinanceAiNowIntakeBatch } = await import("@/server/actions/finance-ai");
  const intake = await runFinanceAiNowIntakeBatch();
  const journey = await loadJourneySnapshotRaw();
  const session = mergeNowPollingSession(journey?.nowPolling);
  session.anchorAt = new Date().toISOString();
  await saveNowPollingSession(session);
  await checkAndPersistMarketAiJourney();

  return {
    success: intake.success,
    message: intake.message,
    ok: intake.ok,
    failed: intake.total != null && intake.ok != null ? intake.total - intake.ok : undefined,
    error: intake.error,
  };
}

export async function startNowPolling(): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  if (!isFinanceAiConfigured()) {
    return { success: false, error: "FinanceAI no configurado" };
  }
  const rows = await listTickersForGestion();
  const scheduled = rows.filter(
    (t) =>
      t.financeAiStatus === "ready" &&
      nowPollIntervalMinutes(nowPollIntervalFromDb(t.financeAiNowPollInterval)) > 0
  );
  if (scheduled.length === 0) {
    return {
      success: false,
      error: "Configura al menos un ticker con intervalo 1 / 5 / 10 / 30 / 1 h en Result Now.",
    };
  }

  const session = mergeNowPollingSession((await loadJourneySnapshotRaw())?.nowPolling);
  session.active = true;
  session.anchorAt = new Date().toISOString();
  await saveNowPollingSession(session);

  return {
    success: true,
    message: `Polling NOW activo · ${scheduled.length} ticker(s) programados`,
  };
}

export async function stopNowPolling(): Promise<{
  success: boolean;
  message?: string;
}> {
  const session = mergeNowPollingSession((await loadJourneySnapshotRaw())?.nowPolling);
  session.active = false;
  await saveNowPollingSession(session);
  return { success: true, message: "Polling NOW detenido" };
}

/** Called from client while session active — runs due per-ticker polls. */
export async function runDueNowPolls(): Promise<{
  success: boolean;
  polled: string[];
  skipped?: string;
  error?: string;
}> {
  if (!isFinanceAiConfigured()) {
    return { success: false, polled: [], error: "FinanceAI no configurado" };
  }

  const journey = await loadJourneySnapshotRaw();
  const session = mergeNowPollingSession(journey?.nowPolling);
  if (!session.active) {
    return { success: true, polled: [], skipped: "inactive" };
  }
  if (!isNowPollingWindowEt()) {
    return { success: true, polled: [], skipped: "outside_aws_poll_window" };
  }

  const rows = await listTickersForGestion();
  const tickersNow = resolveTickersNowSymbols(journey?.aws?.tickersNow ?? null, tradingDateEt());
  if (tickersNow.length === 0) {
    return { success: true, polled: [], skipped: "tickers_today_empty" };
  }
  const anchorAt = session.anchorAt;
  const polled: string[] = [];

  for (const row of rows) {
    if (row.financeAiStatus !== "ready") continue;
    if (!tickersNow.includes(row.symbol)) continue;
    const interval = nowPollIntervalFromDb(row.financeAiNowPollInterval);
    if (nowPollIntervalMinutes(interval) <= 0) continue;
    const lastAt = row.financeAiNowLastPollAt?.toISOString() ?? null;
    if (!isNowPollDue(interval, lastAt, anchorAt)) continue;

    const result = await runFinanceAiNowIntake(row.symbol);
    if (result.success) {
      polled.push(row.symbol);
      await markTickerPolled(row.symbol);
    }
  }

  session.lastSchedulerTickAt = new Date().toISOString();
  await saveNowPollingSession(session);

  if (polled.length > 0) {
    await checkAndPersistMarketAiJourney();
  }

  return { success: true, polled };
}

export async function getNowPollingSession(): Promise<NowPollingSession> {
  const journey = await loadJourneySnapshotRaw();
  return mergeNowPollingSession(journey?.nowPolling ?? DEFAULT_NOW_POLLING_SESSION);
}
