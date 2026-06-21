"use server";

import {
  normalizeNowPollInterval,
  nowPollIntervalFromDb,
  nowPollIntervalToDb,
  type NowPollIntervalSelection,
} from "@/lib/now-polling-session";
import { MARKET_PATH } from "@/lib/tools-paths";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { listTickersForGestion } from "@/server/actions/tickers";
import {
  getNowPollingStatus,
  isFinanceAiConfigured,
  setTickerNowSchedule,
} from "@/server/services/finance-ai-client";

export type NowPollIntervalRow = {
  symbol: string;
  name: string | null;
  status: string | null;
  pollInterval: NowPollIntervalSelection;
  lastPollAt: string | null;
  awsScheduled: boolean;
};

function revalidateNowPaths() {
  revalidatePath("/config");
  revalidatePath("/config/aws");
  revalidatePath("/config/tickers");
  revalidatePath(MARKET_PATH);
}

export async function loadNowPollIntervalRows(): Promise<{
  success: boolean;
  rows?: NowPollIntervalRow[];
  error?: string;
}> {
  try {
    const tickers = await listTickersForGestion();
    let scheduled = new Set<string>();
    if (isFinanceAiConfigured()) {
      const status = await getNowPollingStatus();
      if (status.ok) {
        scheduled = new Set(status.data.scheduledSymbols ?? []);
        for (const [sym, row] of Object.entries(status.data.tickers ?? {})) {
          if (row?.scheduled) scheduled.add(sym);
        }
      }
    }
    const rows: NowPollIntervalRow[] = tickers.map((t) => ({
      symbol: t.symbol,
      name: t.name,
      status: t.financeAiStatus,
      pollInterval: nowPollIntervalFromDb(t.financeAiNowPollInterval),
      lastPollAt: t.financeAiNowLastPollAt?.toISOString() ?? null,
      awsScheduled: scheduled.has(t.symbol),
    }));
    return { success: true, rows };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "No se pudo cargar intervalos NOW",
    };
  }
}

export async function saveNowPollIntervals(
  intervals: Record<string, NowPollIntervalSelection>
): Promise<{ success: boolean; error?: string; saved?: number }> {
  try {
    let saved = 0;
    for (const [symbol, raw] of Object.entries(intervals)) {
      const sym = symbol.trim().toUpperCase();
      const interval = normalizeNowPollInterval(raw);
      await prisma.ticker.update({
        where: { symbol: sym },
        data: { financeAiNowPollInterval: nowPollIntervalToDb(interval) },
      });
      saved += 1;
    }
    revalidateNowPaths();
    return { success: true, saved };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "No se pudo guardar intervalos",
    };
  }
}

export async function startAutomaticNowChecks(
  intervals: Record<string, NowPollIntervalSelection>
): Promise<{ success: boolean; message?: string; error?: string }> {
  const saveResult = await saveNowPollIntervals(intervals);
  if (!saveResult.success) {
    return { success: false, error: saveResult.error };
  }
  revalidateNowPaths();
  return {
    success: false,
    error:
      "Checks automáticos NOW desactivados — solo Movimiento 15M es automático. " +
      "Usa Intake en el Journey para refrescar TickersNow.",
  };
}

export async function stopTickerAutomaticNowCheck(
  symbol: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  if (!isFinanceAiConfigured()) {
    return { success: false, error: "FinanceAI no configurado" };
  }
  const sym = symbol.trim().toUpperCase();
  const result = await setTickerNowSchedule(sym, false);
  if (!result.ok) {
    return { success: false, error: result.error };
  }
  revalidateNowPaths();
  return { success: true, message: `${sym} — intake programado detenido en AWS` };
}
