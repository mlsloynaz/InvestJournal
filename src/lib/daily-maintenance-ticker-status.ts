import { formatFinanceAiTimestamp } from "@/lib/format-datetime";
import { tradingDateEt } from "@/lib/live-session-window";
import type {
  FinanceAiDailyMaintenanceResult,
  FinanceAiDailyMaintenanceStatus,
  FinanceAiDailyMaintenanceTickerResult,
} from "@/server/services/finance-ai-client";

export type DailyMaintenanceTickerOutcome = "success" | "error" | "skipped" | "pending";

export type DailyMaintenanceTickerInfo = {
  symbol: string;
  outcome: DailyMaintenanceTickerOutcome;
  error?: string;
  reason?: string;
  dailyBars?: number;
  hourlyBars?: number;
  min15Bars?: number;
  group?: string;
};

export type DailyMaintenanceAlertSummary = {
  kind: "ok" | "warn" | "error" | "none" | "running";
  title: string;
  body: string;
};

function entryToInfo(
  entry: FinanceAiDailyMaintenanceTickerResult,
  outcome: Exclude<DailyMaintenanceTickerOutcome, "pending">,
  group?: string
): DailyMaintenanceTickerInfo {
  return {
    symbol: String(entry.symbol || "").toUpperCase(),
    outcome,
    error: entry.error,
    reason: entry.reason,
    dailyBars: entry.dailyBars,
    hourlyBars: entry.hourlyBars,
    min15Bars: entry.min15Bars,
    group,
  };
}

/** Per-symbol view of today's `dailyMaintenanceResult` (Recopilar 4 AM). */
export function indexDailyMaintenanceTickers(
  result: FinanceAiDailyMaintenanceResult | null | undefined
): Map<string, DailyMaintenanceTickerInfo> {
  const map = new Map<string, DailyMaintenanceTickerInfo>();
  if (!result) return map;

  const groups = result.groups ?? {};
  for (const [groupKey, bucket] of Object.entries(groups)) {
    if (!bucket || typeof bucket !== "object") continue;
    for (const outcome of ["success", "error", "skipped"] as const) {
      for (const entry of bucket[outcome] ?? []) {
        if (!entry?.symbol) continue;
        map.set(
          String(entry.symbol).toUpperCase(),
          entryToInfo(entry, outcome, groupKey)
        );
      }
    }
  }

  const barGroups = result.barGroups ?? {};
  for (const [groupKey, symbols] of Object.entries(barGroups)) {
    for (const sym of symbols ?? []) {
      const upper = String(sym).toUpperCase();
      if (!upper || map.has(upper)) continue;
      map.set(upper, { symbol: upper, outcome: "pending", group: groupKey });
    }
  }

  return map;
}

export function maintenanceOutcomeClass(outcome: DailyMaintenanceTickerOutcome): string {
  switch (outcome) {
    case "success":
      return "bg-emerald-100 text-emerald-800";
    case "error":
      return "bg-red-100 text-red-800";
    case "skipped":
      return "bg-gray-100 text-gray-700";
    case "pending":
      return "bg-amber-100 text-amber-800";
    default:
      return "bg-gray-50 text-gray-500";
  }
}

export function maintenanceOutcomeLabel(
  outcome: DailyMaintenanceTickerOutcome,
  info?: Pick<DailyMaintenanceTickerInfo, "reason">
): string {
  if (outcome === "success" && info?.reason?.includes("Get Latest Prices")) {
    return "Barras OK";
  }
  if (outcome === "success" && info?.reason?.includes("bar-request")) {
    return "Barras OK";
  }
  switch (outcome) {
    case "success":
      return "Recopilar OK";
    case "error":
      return "Recopilar error";
    case "skipped":
      return "Omitido";
    case "pending":
      return "Recopilar pendiente";
    default:
      return "—";
  }
}

export function formatMaintenanceTickerDetail(info: DailyMaintenanceTickerInfo | undefined): string | null {
  if (!info) return null;
  const bars: string[] = [];
  if (info.dailyBars != null) bars.push(`D:${info.dailyBars}`);
  if (info.hourlyBars != null) bars.push(`H:${info.hourlyBars}`);
  if (info.min15Bars != null) bars.push(`15m:${info.min15Bars}`);
  if (info.error?.trim()) return info.error.trim();
  if (info.reason?.trim()) return info.reason.trim();
  if (bars.length > 0) return bars.join(" · ");
  if (info.outcome === "pending") return "Esperando grupo de barras 4 AM";
  return null;
}

function formatSymbolList(symbols: string[], max = 12): string {
  if (symbols.length === 0) return "—";
  const head = symbols.slice(0, max).join(", ");
  const tail = symbols.length > max ? ` +${symbols.length - max}` : "";
  return `${head}${tail}`;
}

function timestampTradeDateEt(iso: string | null | undefined): string | null {
  if (!iso?.trim()) return null;
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(parsed));
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const d = parts.find((p) => p.type === "day")?.value;
  return y && m && d ? `${y}-${m}-${d}` : null;
}

/** bar-request finished today (manual Get Latest Prices or Recopilar) per schedules.dailyMaintenance. */
export function isBarRequestFinishedToday(
  status: FinanceAiDailyMaintenanceStatus | null | undefined
): boolean {
  if (!status?.lastRunStatus || status.lastRunStatus === "running") return false;
  const today = tradingDateEt();
  const runDate =
    status.lastRunTradeDate?.trim() ||
    timestampTradeDateEt(status.lastRunFinishedAt) ||
    timestampTradeDateEt(status.lastRunAt);
  return runDate === today;
}

export function isBarRequestSuccessfulToday(
  status: FinanceAiDailyMaintenanceStatus | null | undefined
): boolean {
  if (!isBarRequestFinishedToday(status)) return false;
  if (status?.lastRunSkipped || status?.lastRunStatus === "skipped") return false;
  const failed = status?.lastRunFailed ?? 0;
  const ok = status?.lastRunOk ?? 0;
  if (failed > 0) return false;
  if (ok > 0) return true;
  const terminal = (status?.lastRunStatus ?? "").toLowerCase();
  return terminal === "complete" || terminal === "success" || terminal === "ok";
}

function buildBarRequestStatusSummary(
  status: FinanceAiDailyMaintenanceStatus
): DailyMaintenanceAlertSummary {
  const tradeDate = status.lastRunTradeDate ?? tradingDateEt();
  const when = formatFinanceAiTimestamp(status.lastRunFinishedAt ?? status.lastRunAt ?? undefined);
  const source = status.lastRunSource?.trim();
  const counts =
    status.lastRunOk != null && status.lastRunSymbolCount != null
      ? `${status.lastRunOk}/${status.lastRunSymbolCount} tickers OK`
      : null;
  const failed = status.lastRunFailed ?? 0;
  const skipped = status.lastRunSkippedSymbols ?? 0;

  if (status.lastRunSkipped || status.lastRunStatus === "skipped") {
    return {
      kind: "warn",
      title: `bar-request omitido · ${tradeDate}`,
      body: [
        when && `Último intento ${when}.`,
        status.lastRunSkipReason?.trim() || status.lastRunMessage?.trim(),
      ]
        .filter(Boolean)
        .join(" "),
    };
  }

  const parts = [
    when ? `Ejecutado ${when}` : "Ejecutado hoy",
    source ? `(${source})` : null,
    counts,
    failed > 0 ? `${failed} con error` : null,
    skipped > 0 ? `${skipped} omitidos` : null,
    status.lastRunMessage?.trim(),
    "Sin desglose por ticker en dailyMaintenanceResult (solo Recopilar 4 AM).",
    "La última vela puede ser del cierre anterior si hoy no hubo sesión.",
  ].filter(Boolean);

  return {
    kind: failed > 0 ? "warn" : "ok",
    title: `bar-request completado · ${tradeDate}`,
    body: parts.join(" · "),
  };
}

/** Per-ticker chip when schedules show success but dailyMaintenanceResult has no row. */
export function tickerBarRequestFromSession(
  symbol: string,
  status: FinanceAiDailyMaintenanceStatus | null | undefined,
  options?: { ctxReady?: boolean; barSucceededLocally?: boolean }
): DailyMaintenanceTickerInfo | undefined {
  if (options?.barSucceededLocally && options.ctxReady !== false) {
    return {
      symbol: symbol.toUpperCase(),
      outcome: "success",
      reason: "Get Latest Prices",
    };
  }
  if (!isBarRequestSuccessfulToday(status) || options?.ctxReady !== true) return undefined;

  const runCount = status?.lastRunSymbolCount ?? 0;
  const okCount = status?.lastRunOk ?? 0;
  // Multi-ticker bar-request without dailyMaintenanceResult — OK chip when ctx is ready.
  if (runCount > 1 && okCount >= runCount) {
    return {
      symbol: symbol.toUpperCase(),
      outcome: "success",
      reason: status?.lastRunSource?.trim() || "bar-request hoy",
    };
  }
  return undefined;
}

/** Banner body for the Ticker Context panel — lists tickers from result-daily-maintenance. */
export function buildMaintenanceAlertSummary(
  result: FinanceAiDailyMaintenanceResult | null | undefined,
  status: FinanceAiDailyMaintenanceStatus | null | undefined,
  catalogSymbols: string[]
): DailyMaintenanceAlertSummary {
  if (status?.lastRunStatus === "running") {
    return {
      kind: "running",
      title: "bar-request en curso",
      body: "Actualizando barras en AWS. Los tickers se refrescarán al terminar.",
    };
  }

  if (!result) {
    if (status && isBarRequestFinishedToday(status)) {
      return buildBarRequestStatusSummary(status);
    }
    return {
      kind: "none",
      title: "Sin bar-request hoy",
      body:
        catalogSymbols.length > 0
          ? "Usa Get Latest Prices para refrescar barras, o Recopilar en Config → AWS (cron 4:00 ET)."
          : "No hay tickers en el catálogo.",
    };
  }

  const indexed = indexDailyMaintenanceTickers(result);
  const ok: string[] = [];
  const err: string[] = [];
  const skipped: string[] = [];
  const pending: string[] = [];

  for (const sym of catalogSymbols) {
    const info = indexed.get(sym.toUpperCase());
    if (!info) continue;
    if (info.outcome === "success") ok.push(sym);
    else if (info.outcome === "error") err.push(sym);
    else if (info.outcome === "skipped") skipped.push(sym);
    else if (info.outcome === "pending") pending.push(sym);
  }

  const parts: string[] = [];
  if (ok.length > 0) parts.push(`OK (${ok.length}): ${formatSymbolList(ok)}`);
  if (err.length > 0) parts.push(`Error (${err.length}): ${formatSymbolList(err)}`);
  if (skipped.length > 0) parts.push(`Omitidos (${skipped.length}): ${formatSymbolList(skipped)}`);
  if (pending.length > 0) parts.push(`Pendientes (${pending.length}): ${formatSymbolList(pending)}`);

  const tradeDate = result.tradeDate ?? status?.lastRunTradeDate ?? "—";
  const counts =
    result.successCount != null
      ? `${result.successCount} OK · ${result.failedCount ?? 0} error · ${result.skippedCount ?? 0} omitidos`
      : null;

  let body = parts.length > 0 ? parts.join(" · ") : "Sin tickers del catálogo en el resultado de hoy.";
  if (counts) body = `${counts} · ${body}`;
  if (result.pipelineEval?.foundationCount != null) {
    body = `Foundation ${result.pipelineEval.foundationCount}/${result.pipelineEval.total ?? "?"} · ${body}`;
  }
  if (result.intakeStopped && result.intakeStopMessage) {
    body = `${result.intakeStopMessage} · ${body}`;
  }

  const kind: DailyMaintenanceAlertSummary["kind"] = result.intakeStopped
    ? "error"
    : err.length > 0
      ? "warn"
      : pending.length > 0 && !result.finishedAt
        ? "running"
        : "ok";

  return {
    kind,
    title: `Recopilar ${tradeDate}${result.phase ? ` · ${result.phase}` : ""}`,
    body,
  };
}
