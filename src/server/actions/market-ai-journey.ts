"use server";



import { prisma } from "@/lib/db";

import { effectiveTradingDateEt, tradingDateEt } from "@/lib/live-session-window";

import {

  buildJourneyStepStatuses,

  isPremarketBaselineReadyToPersist,

  lookupJourneyPremarket,

  type JourneyAwsSnapshot,

  type JourneyProcessControl,

  type JourneyProcessKey,

  type JourneyTickerLocal,

} from "@/lib/market-ai-journey";

import type { FinanceAiPremarketAnalysis } from "@/lib/finance-ai-types";

import { detectPremarketGapEntry } from "@/lib/gap-entry-watch";

import {

  DEFAULT_JOURNEY_PROCESS_CONTROL,

  normalizeProcessControl,

  type PersistedMarketAiJourney,

} from "@/lib/market-ai-journey-persist";

import { mergeNowPollingSession } from "@/lib/now-polling-session";

import { MARKET_PATH } from "@/lib/tools-paths";

import {

  fetchJourneyBubbleStatus,

  persistFinanceAiPremarketRun,

  runFinanceAiPostmarket,

  runFinanceAiNowIntakeBatch,

} from "@/server/actions/finance-ai";

import { stopNowPolling } from "@/server/actions/now-polling";

import {

  listTickersForGestion,

  listTickersForTickerContext,

  persistTickersTodayPool,

} from "@/server/actions/tickers";

import { sessionAnalysisSymbolsFromReady } from "@/lib/tickers-now";

import { revalidatePath } from "next/cache";



const SNAPSHOT_ROW_ID = 1;



function gestionLocalsFromRows(

  rows: Awaited<ReturnType<typeof listTickersForGestion>>

): JourneyTickerLocal[] {

  return rows.map((t) => ({

    symbol: t.symbol,

    status: t.financeAiStatus,

    premarketAt: t.financeAiPremarketAt?.toISOString() ?? null,

    premarketDate: t.financeAiPremarketDate,

    premarketMode: t.financeAiPremarketMode,

    liveEligible: t.financeAiLiveEligible,

  }));

}



function readySymbols(locals: JourneyTickerLocal[]): string[] {

  return locals.filter((t) => t.status === "ready").map((t) => t.symbol);

}



async function buildPersistedJourney(

  aws: JourneyAwsSnapshot,

  locals: JourneyTickerLocal[],

  processControl: JourneyProcessControl,

  nowPolling?: import("@/lib/now-polling-session").NowPollingSession | null

): Promise<PersistedMarketAiJourney> {

  let session = mergeNowPollingSession(nowPolling);

  if (processControl.now !== "on") {

    session = { ...session, active: false };

  }

  const stepStatuses = buildJourneyStepStatuses(locals, aws, processControl, session);

  return {

    aws,

    stepStatuses,

    processControl: normalizeProcessControl(processControl, stepStatuses),

    nowPolling: session,

  };

}



async function savePersistedJourney(persisted: PersistedMarketAiJourney): Promise<void> {

  const tradeDate = persisted.aws.tradeDate ?? effectiveTradingDateEt();

  await prisma.marketAiJourneySnapshot.upsert({

    where: { id: SNAPSHOT_ROW_ID },

    create: {

      id: SNAPSHOT_ROW_ID,

      tradeDate,

      checkedAt: new Date(persisted.aws.checkedAt),

      snapshotJson: JSON.stringify(persisted),

    },

    update: {

      tradeDate,

      checkedAt: new Date(persisted.aws.checkedAt),

      snapshotJson: JSON.stringify(persisted),

    },

  });

}



async function loadProcessControl(): Promise<JourneyProcessControl> {

  const row = await prisma.marketAiJourneySnapshot.findUnique({

    where: { id: SNAPSHOT_ROW_ID },

    select: { snapshotJson: true, tradeDate: true },

  });

  if (!row || row.tradeDate !== effectiveTradingDateEt()) {

    return { ...DEFAULT_JOURNEY_PROCESS_CONTROL };

  }

  try {

    const parsed = JSON.parse(row.snapshotJson) as PersistedMarketAiJourney;

    return parsed.processControl ?? { ...DEFAULT_JOURNEY_PROCESS_CONTROL };

  } catch {

    return { ...DEFAULT_JOURNEY_PROCESS_CONTROL };

  }

}



export async function loadPersistedMarketAiJourney(): Promise<PersistedMarketAiJourney | null> {

  const today = effectiveTradingDateEt();

  const row = await prisma.marketAiJourneySnapshot.findUnique({

    where: { id: SNAPSHOT_ROW_ID },

  });

  if (!row || row.tradeDate !== today) return null;

  try {

    const parsed = JSON.parse(row.snapshotJson) as PersistedMarketAiJourney;

    if (!parsed?.aws?.checkedAt) return null;

    return parsed;

  } catch {

    return null;

  }

}



export async function checkAndPersistMarketAiJourney(): Promise<{

  success: boolean;

  journey?: PersistedMarketAiJourney;

  error?: string;

}> {

  const rows = await listTickersForTickerContext();

  const locals = gestionLocalsFromRows(rows);

  const existing = await loadPersistedMarketAiJourney();



  const fetch = await fetchJourneyBubbleStatus();

  if (!fetch.success || !fetch.checkedAt) {

    return { success: false, error: fetch.error ?? "No se pudo consultar AWS" };

  }



  const aws: JourneyAwsSnapshot = {

    checkedAt: fetch.checkedAt,

    tradeDate: fetch.tradeDate!,

    nowPolling: fetch.nowPolling,

    tickersNow: fetch.tickersNow ?? existing?.aws?.tickersNow,

    postmarketStats: fetch.postmarketStats ?? null,

    premarketBySymbol: {},

    postmarketBySymbol: {},

  };



  if (aws.tickersNow?.symbols?.length) {

    await persistTickersTodayPool(aws.tickersNow.symbols, aws.tradeDate);

  }



  const processControl = await loadProcessControl();

  const journey = await buildPersistedJourney(

    aws,

    locals,

    processControl,

    existing?.nowPolling

  );

  await savePersistedJourney(journey);

  revalidatePath(MARKET_PATH);

  return { success: true, journey };

}



/** Write ticker PRE summary to MySQL when AWS PremarketAnalysis is ready (morning PRE only). */

export async function persistReadyPremarketSummaries(

  premarketBySymbol: Record<string, FinanceAiPremarketAnalysis | null | undefined>,

  symbols: string[],

  tradeDate?: string

): Promise<{ success: boolean; persisted: string[]; error?: string }> {

  const today = tradeDate ?? tradingDateEt();

  const persisted: string[] = [];

  try {

    for (const symbol of symbols) {

      const row = lookupJourneyPremarket(premarketBySymbol, symbol);

      if (!isPremarketBaselineReadyToPersist(row, today)) continue;

      await persistFinanceAiPremarketRun(symbol, {

        mode: row!.mode ?? "full",

        bias: row!.bias ?? null,

        revision: row!.revision ?? null,

        tradeDate: row!.date ?? today,

        gapEntry: detectPremarketGapEntry(row!),

      });

      persisted.push(symbol);

    }

    return { success: true, persisted };

  } catch (e) {

    return {

      success: false,

      persisted,

      error: e instanceof Error ? e.message : "No se pudo guardar PRE en MySQL",

    };

  }

}



async function persistControlUpdate(

  control: JourneyProcessControl

): Promise<PersistedMarketAiJourney | null> {

  const existing = await loadPersistedMarketAiJourney();

  if (!existing) return null;

  const journey = { ...existing, processControl: control };

  await savePersistedJourney(journey);

  return journey;

}



export async function startJourneyProcess(

  key: JourneyProcessKey,

  _options?: { resetBars?: boolean }

): Promise<{ success: boolean; message?: string; error?: string; journey?: PersistedMarketAiJourney }> {

  const rows = await listTickersForTickerContext();

  const locals = gestionLocalsFromRows(rows);

  const today = effectiveTradingDateEt();

  const journey = await loadPersistedMarketAiJourney();

  const tickersNow = journey?.aws?.tickersNow ?? null;

  const ready = readySymbols(locals);

  const symbols = sessionAnalysisSymbolsFromReady(ready, tickersNow, today);



  if (symbols.length === 0) {

    return {

      success: false,

      error: "Sin tickers listos — actualiza barras en Ticker Context (/market).",

    };

  }



  const control = await loadProcessControl();



  if (key === "now") {

    await stopNowPolling();

    control.now = "off";

    await persistControlUpdate(control);



    const intake = await runFinanceAiNowIntakeBatch(undefined, { journeyManual: true });

    const refresh = await checkAndPersistMarketAiJourney();

    if (!intake.success) {

      return {

        success: false,

        error: intake.error ?? "NOW intake falló — revisa barras y TickersToday",

        journey: refresh.journey,

      };

    }

    return {

      success: true,

      message:

        intake.message ??

        "NOW manual · barras incrementales + checklist (sin polling automático)",

      journey: refresh.journey,

    };

  }



  if (key === "post") {

    try {

      const { syncFinanceAiWatchlistFromFavorites } = await import(

        "@/server/actions/finance-ai-schedules"

      );

      await syncFinanceAiWatchlistFromFavorites();

    } catch {

      // Continue — manual POST still runs per ticker.

    }

  }



  let started = 0;

  const errors: string[] = [];

  for (const symbol of symbols) {

    const result = await runFinanceAiPostmarket(symbol);

    if (result.success) {

      started += 1;

    } else if (result.error) {

      errors.push(`${symbol}: ${result.error}`);

    }

  }

  const refresh = await checkAndPersistMarketAiJourney();

  if (started === 0) {

    return {

      success: false,

      error:

        errors.slice(0, 3).join(" · ") ||

        "No se pudo iniciar post-market — ¿sesión cerrada y tickers listos?",

      journey: refresh.journey,

    };

  }

  return {

    success: true,

    message: `Post iniciado · ${started}/${symbols.length} ticker(s) — esperando AWS…`,

    journey: refresh.journey,

  };

}



export async function stopJourneyProcess(

  key: JourneyProcessKey

): Promise<{ success: boolean; message?: string; error?: string; journey?: PersistedMarketAiJourney }> {

  if (key === "now") {

    const result = await stopNowPolling();

    const control = await loadProcessControl();

    control.now = "off";

    await persistControlUpdate(control);

    const refresh = await checkAndPersistMarketAiJourney();

    return {

      success: true,

      message: result.message ?? "Polling NOW detenido",

      journey: refresh.journey,

    };

  }



  const control = await loadProcessControl();

  control[key] = "off";

  await persistControlUpdate(control);



  const refresh = await checkAndPersistMarketAiJourney();

  return {

    success: true,

    message:

      "Post marcado como detenido. Los workers AWS en curso pueden terminar — pulsa CheckStatus para actualizar.",

    journey: refresh.journey,

  };

}



export async function toggleJourneyProcess(

  key: JourneyProcessKey,

  active: boolean

): Promise<{ success: boolean; message?: string; error?: string; journey?: PersistedMarketAiJourney }> {

  if (active) {

    return stopJourneyProcess(key);

  }

  return startJourneyProcess(key);

}


