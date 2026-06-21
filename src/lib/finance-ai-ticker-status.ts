import type { FinanceAiTickerContext } from "@/lib/finance-ai-types";
import { formatBarDatetime, formatFinanceAiTimestamp } from "@/lib/format-datetime";
import {
  fetchFinanceAiTickerContext,
} from "@/server/actions/finance-ai";

export type FinanceAiAwsStatus = "unknown" | "missing" | "initializing" | "ready" | "error";

export function persistedToFinanceAiAwsStatus(
  value: string | null | undefined
): FinanceAiAwsStatus {
  if (!value) return "missing";
  if (value === "ready" || value === "initializing" || value === "error" || value === "missing") {
    return value;
  }
  return "unknown";
}

export function financeAiStatusLabel(status: FinanceAiAwsStatus): string {
  switch (status) {
    case "ready":
      return "Listo";
    case "initializing":
      return "Inicializando…";
    case "error":
      return "Error";
    case "missing":
      return "Sin contexto";
    default:
      return "—";
  }
}

export function financeAiStatusClass(status: FinanceAiAwsStatus): string {
  switch (status) {
    case "ready":
      return "bg-green-100 text-green-800";
    case "initializing":
      return "bg-amber-100 text-amber-800";
    case "error":
      return "bg-red-100 text-red-800";
    case "missing":
      return "bg-gray-100 text-gray-700";
    default:
      return "bg-gray-50 text-gray-500";
  }
}

export async function resolveFinanceAiTickerStatus(symbol: string): Promise<{
  status: FinanceAiAwsStatus;
  error?: string;
  context?: FinanceAiTickerContext;
}> {
  const ctx = await fetchFinanceAiTickerContext(symbol);
  if (ctx.success && ctx.context) {
    const s = ctx.context.status;
    if (s === "ready") return { status: "ready", context: ctx.context };
    if (s === "initializing") return { status: "initializing", context: ctx.context };
    if (s === "error") {
      return { status: "error", error: ctx.context.error, context: ctx.context };
    }
  }
  const err = ctx.error ?? "";
  if (err.includes("No context") || err.includes("404") || err.includes("not found")) {
    return { status: "missing" };
  }
  if (err) return { status: "error", error: err };
  return { status: "missing" };
}

export function formatStoredHistoryDatetime(
  context: FinanceAiTickerContext | null | undefined,
  persistedLastBarAt?: string | null,
  persistedSyncedAt?: string | null
): string | null {
  const hist = context?.historicalData;
  const lastBar = hist?.lastBarAt ?? persistedLastBarAt ?? null;
  if (lastBar) return formatBarDatetime(lastBar);
  if (persistedSyncedAt) return formatFinanceAiTimestamp(persistedSyncedAt);
  if (context?.updatedAt) return formatFinanceAiTimestamp(context.updatedAt);
  return null;
}

export function storedHistoryDetailLines(
  context: FinanceAiTickerContext | null | undefined
): string[] {
  const hist = context?.historicalData;
  if (!hist) return [];
  const lines: string[] = [];
  if (hist.dailyThrough) lines.push(`D: ${formatBarDatetime(hist.dailyThrough)}`);
  if (hist.hourlyThrough) lines.push(`H: ${formatBarDatetime(hist.hourlyThrough)}`);
  if (hist.min15Through) lines.push(`15m: ${formatBarDatetime(hist.min15Through)}`);
  return lines;
}

const TICKER_CONTEXT_STALE_MS = 24 * 60 * 60 * 1000;

function parseBarOrIsoMs(value: string): number | null {
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const hasTime = normalized.includes(":");
  const parsed = Date.parse(hasTime ? normalized : `${normalized}T12:00:00`);
  return Number.isNaN(parsed) ? null : parsed;
}

export function parseTickerContextUpdatedMs(
  context: FinanceAiTickerContext | null | undefined,
  persistedLastBarAt?: string | null,
  persistedSyncedAt?: string | null
): number | null {
  const candidates = [
    context?.historicalData?.lastBarAt,
    context?.updatedAt,
    persistedLastBarAt,
    persistedSyncedAt,
  ];
  for (const raw of candidates) {
    if (!raw?.trim()) continue;
    const ms = parseBarOrIsoMs(raw);
    if (ms != null) return ms;
  }
  return null;
}

export function isTickerContextStale(
  context: FinanceAiTickerContext | null | undefined,
  persistedLastBarAt?: string | null,
  persistedSyncedAt?: string | null,
  staleMs = TICKER_CONTEXT_STALE_MS
): boolean {
  const ms = parseTickerContextUpdatedMs(context, persistedLastBarAt, persistedSyncedAt);
  if (ms == null) return true;
  return Date.now() - ms >= staleMs;
}

export function tickerNeedsContextRefresh(
  status: FinanceAiAwsStatus,
  context: FinanceAiTickerContext | null | undefined,
  persistedLastBarAt?: string | null,
  persistedSyncedAt?: string | null
): boolean {
  if (status === "initializing") return false;
  if (status === "missing" || status === "error") return true;
  if (status === "ready") {
    return isTickerContextStale(context, persistedLastBarAt, persistedSyncedAt);
  }
  return false;
}
