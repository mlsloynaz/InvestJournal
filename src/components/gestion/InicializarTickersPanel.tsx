"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { FinanceAiTickerContext } from "@/lib/finance-ai-types";
import {
  buildMaintenanceAlertSummary,
  formatMaintenanceTickerDetail,
  indexDailyMaintenanceTickers,
  maintenanceOutcomeClass,
  maintenanceOutcomeLabel,
  tickerBarRequestFromSession,
  type DailyMaintenanceTickerInfo,
} from "@/lib/daily-maintenance-ticker-status";
import {
  financeAiStatusClass,
  financeAiStatusLabel,
  formatStoredHistoryDatetime,
  persistedToFinanceAiAwsStatus,
  resolveFinanceAiTickerStatus,
  storedHistoryDetailLines,
  type FinanceAiAwsStatus,
} from "@/lib/finance-ai-ticker-status";
import { CollapsibleResultSection } from "@/components/gestion/CollapsibleResultSection";
import {
  fetchDailyMaintenanceForTickerPanel,
  persistFinanceAiTickerState,
  refreshFinanceAiMarketCalendar,
  triggerFinanceAiBarRequest,
  triggerFinanceAiFoundationFor15m,
} from "@/server/actions/finance-ai";
import type {
  FinanceAiDailyMaintenanceResult,
  FinanceAiDailyMaintenanceStatus,
} from "@/server/services/finance-ai-client";

const TICKER_BTN =
  "text-xs bg-investep-gold text-investep-navy px-2 py-1 rounded font-medium disabled:opacity-50";

type TickerRow = {
  symbol: string;
  name: string | null;
  isFavorite?: boolean;
  financeAi?: {
    status: string | null;
    syncedAt: string | null;
    lastBarAt: string | null;
    error: string | null;
  };
};

type TickerState = {
  status: FinanceAiAwsStatus;
  error: string | null;
  context: FinanceAiTickerContext | null;
  historyLabel: string | null;
  historyDetail: string[];
};

type Props = {
  tickers: TickerRow[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onRefresh?: () => void;
};

function rowFromPersisted(ticker: TickerRow): TickerState {
  const status = persistedToFinanceAiAwsStatus(ticker.financeAi?.status);
  return {
    status,
    error: ticker.financeAi?.error ?? null,
    context: null,
    historyLabel: formatStoredHistoryDatetime(
      null,
      ticker.financeAi?.lastBarAt,
      ticker.financeAi?.syncedAt
    ),
    historyDetail: [],
  };
}

function rowFromResolved(
  ticker: TickerRow,
  resolved: Awaited<ReturnType<typeof resolveFinanceAiTickerStatus>>
): TickerState {
  return {
    status: resolved.status,
    error: resolved.error ?? null,
    context: resolved.context ?? null,
    historyLabel: formatStoredHistoryDatetime(
      resolved.context,
      ticker.financeAi?.lastBarAt,
      ticker.financeAi?.syncedAt
    ),
    historyDetail: storedHistoryDetailLines(resolved.context),
  };
}

export function InicializarTickersPanel({
  tickers,
  open: openProp,
  onOpenChange,
  onRefresh,
}: Props) {
  const [openLocal, setOpenLocal] = useState(true);
  const open = openProp ?? openLocal;
  const setOpen = onOpenChange ?? setOpenLocal;

  const allSymbols = useMemo(
    () => tickers.map((t) => t.symbol.trim().toUpperCase()).filter(Boolean),
    [tickers]
  );

  const [rows, setRows] = useState<Record<string, TickerState>>(() =>
    Object.fromEntries(tickers.map((t) => [t.symbol, rowFromPersisted(t)]))
  );
  const [bulkPending, startBulkTransition] = useTransition();
  const [calendarPending, startCalendarTransition] = useTransition();
  const [rowPending, setRowPending] = useState<Record<string, boolean>>({});
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkMessage, setBulkMessage] = useState<string | null>(null);
  const [maintenanceResult, setMaintenanceResult] = useState<FinanceAiDailyMaintenanceResult | null>(
    null
  );
  const [maintenanceStatus, setMaintenanceStatus] = useState<FinanceAiDailyMaintenanceStatus | null>(
    null
  );
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);
  const maintenanceLoadedRef = useRef(false);
  const [maintenanceError, setMaintenanceError] = useState<string | null>(null);
  const [barOkToday, setBarOkToday] = useState<Set<string>>(() => new Set());

  const maintenanceBySymbol = useMemo(
    () => indexDailyMaintenanceTickers(maintenanceResult),
    [maintenanceResult]
  );

  const maintenanceAlert = useMemo(
    () =>
      buildMaintenanceAlertSummary(
        maintenanceResult,
        maintenanceStatus,
        tickers.map((t) => t.symbol)
      ),
    [maintenanceResult, maintenanceStatus, tickers]
  );

  const loadMaintenanceResult = useCallback(async () => {
    setMaintenanceLoading(true);
    setMaintenanceError(null);
    const payload = await fetchDailyMaintenanceForTickerPanel();
    setMaintenanceLoading(false);
    if (!payload.success) {
      setMaintenanceError(payload.error ?? "No se pudo leer Recopilar");
      setMaintenanceResult(null);
      return;
    }
    setMaintenanceResult(payload.result ?? null);
    setMaintenanceStatus(payload.dailyMaintenance ?? null);
  }, []);

  useEffect(() => {
    if (!open || maintenanceLoadedRef.current) return;
    maintenanceLoadedRef.current = true;
    void loadMaintenanceResult();
  }, [open, loadMaintenanceResult]);

  useEffect(() => {
    setRows((prev) => {
      const next = { ...prev };
      for (const ticker of tickers) {
        if (!next[ticker.symbol]) {
          next[ticker.symbol] = rowFromPersisted(ticker);
        }
      }
      return next;
    });
  }, [tickers]);

  const applyResolved = useCallback(
    async (ticker: TickerRow, persist: boolean) => {
      const resolved = await resolveFinanceAiTickerStatus(ticker.symbol);
      const next = rowFromResolved(ticker, resolved);
      setRows((prev) => ({ ...prev, [ticker.symbol]: next }));
      if (persist) {
        await persistFinanceAiTickerState(ticker.symbol, {
          status: resolved.status,
          error: resolved.error ?? null,
          lastBarAt: resolved.context?.historicalData?.lastBarAt ?? null,
        });
      }
      return resolved;
    },
    []
  );

  const refreshRowsAfterBarRequest = useCallback(
    async (symbols: string[]) => {
      for (const symbol of symbols) {
        const ticker = tickers.find((t) => t.symbol === symbol);
        if (!ticker) continue;
        try {
          await applyResolved(ticker, true);
        } catch {
          // keep last known row state
        }
      }
    },
    [tickers, applyResolved]
  );

  const runBarRequest = useCallback(
    async (symbols: string[], resetBars: boolean) => {
      if (symbols.length === 0) {
        return { success: false as const, error: "Sin tickers en el catálogo." };
      }
      for (const symbol of symbols) {
        setRowPending((prev) => ({ ...prev, [symbol]: true }));
      }
      try {
        const result = await triggerFinanceAiBarRequest(symbols, { resetBars });
        if (!result.success) {
          return { success: false as const, error: result.error ?? "bar-request falló" };
        }
        setBarOkToday((prev) => {
          const next = new Set(prev);
          for (const symbol of symbols) next.add(symbol.toUpperCase());
          return next;
        });
        await refreshRowsAfterBarRequest(symbols);
        await loadMaintenanceResult();
        onRefresh?.();
        return { success: true as const, message: result.message };
      } finally {
        for (const symbol of symbols) {
          setRowPending((prev) => ({ ...prev, [symbol]: false }));
        }
      }
    },
    [refreshRowsAfterBarRequest, loadMaintenanceResult, onRefresh]
  );

  const loadAllStatuses = useCallback(() => {
    setBulkError(null);
    setBulkMessage(null);
    startBulkTransition(async () => {
      let failed = 0;
      for (const ticker of tickers) {
        try {
          await applyResolved(ticker, false);
        } catch {
          failed += 1;
        }
      }
      if (failed > 0) {
        setBulkError(`No se pudo leer el estado de ${failed} ticker(s).`);
      }
    });
  }, [tickers, applyResolved]);

  const handleActualizar = useCallback(() => {
    setBulkError(null);
    setBulkMessage(null);
    startBulkTransition(async () => {
      const result = await runBarRequest(allSymbols, false);
      if (!result.success) {
        setBulkError(result.error ?? "bar-request falló");
        return;
      }
      setBulkMessage(result.message ?? `bar-request completado (${allSymbols.length} tickers).`);
    });
  }, [allSymbols, runBarRequest]);

  const handleResetBarras = useCallback(() => {
    setBulkError(null);
    setBulkMessage(null);
    startBulkTransition(async () => {
      const result = await runBarRequest(allSymbols, true);
      if (!result.success) {
        setBulkError(result.error ?? "bar-request reset falló");
        return;
      }
      setBulkMessage(
        result.message ?? `bar-request reset completado (${allSymbols.length} tickers).`
      );
    });
  }, [allSymbols, runBarRequest]);

  const handleActualizarBarrasFoundation = useCallback(() => {
    setBulkError(null);
    setBulkMessage(null);
    startBulkTransition(async () => {
      const result = await triggerFinanceAiFoundationFor15m(allSymbols);
      if (!result.success) {
        setBulkError(result.error ?? "Actualizar barras + foundation falló");
        return;
      }
      await refreshRowsAfterBarRequest(allSymbols);
      await loadMaintenanceResult();
      onRefresh?.();
      setBulkMessage(result.message ?? "Actualizar barras + foundation completado.");
    });
  }, [allSymbols, refreshRowsAfterBarRequest, loadMaintenanceResult, onRefresh]);

  const barOne = useCallback(
    (ticker: TickerRow) => {
      setBulkError(null);
      setBulkMessage(null);
      void (async () => {
        const result = await runBarRequest([ticker.symbol], false);
        if (!result.success) {
          setRows((prev) => ({
            ...prev,
            [ticker.symbol]: {
              ...prev[ticker.symbol],
              status: "error",
              error: result.error ?? "bar-request falló",
            },
          }));
          return;
        }
        setBulkMessage(result.message ?? `bar-request: ${ticker.symbol}.`);
      })();
    },
    [runBarRequest]
  );

  const requestEarningCalendar = useCallback(() => {
    setBulkError(null);
    setBulkMessage(null);
    startCalendarTransition(async () => {
      const result = await refreshFinanceAiMarketCalendar();
      if (result.success) {
        setBulkMessage(result.message ?? "Earnings calendar solicitado.");
      } else {
        setBulkError(result.error ?? "Error al solicitar earnings calendar.");
      }
    });
  }, []);

  return (
    <CollapsibleResultSection
      id="journey-init-tickers"
      title="Ticker Context"
      subtitle="Barras · Actualizar barras + foundation (checklist por ticker)"
      open={open}
      onOpenChange={setOpen}
      borderClass="border-gray-200"
      headerClass="bg-white"
      className="rounded-lg min-w-0 lg:sticky lg:top-4"
      bodyClassName="px-3 py-2 text-xs max-h-[min(36rem,75vh)] overflow-y-auto"
      headerExtra={
        <div className="flex flex-wrap gap-1.5 justify-end">
          <button
            type="button"
            suppressHydrationWarning
            className={TICKER_BTN}
            disabled={bulkPending}
            onClick={loadAllStatuses}
          >
            {bulkPending ? "…" : "Consultar AWS"}
          </button>
          <button
            type="button"
            suppressHydrationWarning
            className="text-xs bg-amber-700 text-white px-2 py-1 rounded font-medium disabled:opacity-50"
            disabled={bulkPending || calendarPending}
            onClick={requestEarningCalendar}
          >
            {calendarPending ? "…" : "Request Earning Calendar"}
          </button>
          <button
            type="button"
            suppressHydrationWarning
            className="text-xs bg-emerald-800 text-white px-2 py-1 rounded font-medium disabled:opacity-50 hover:bg-emerald-900"
            disabled={bulkPending || allSymbols.length === 0}
            title="Barras D/1h/15m + evaluación foundation (checklist por ticker). El cron 4:30 ET hará lo mismo automáticamente."
            onClick={handleActualizarBarrasFoundation}
          >
            {bulkPending ? "Actualizando…" : "Actualizar barras + foundation"}
          </button>
          <button
            type="button"
            suppressHydrationWarning
            className={TICKER_BTN}
            disabled={bulkPending || allSymbols.length === 0}
            onClick={handleActualizar}
          >
            {bulkPending ? "Actualizando…" : "Actualizar barras"}
          </button>
          <button
            type="button"
            suppressHydrationWarning
            className="text-xs border border-amber-600 text-amber-950 bg-amber-50 px-2 py-1 rounded font-medium disabled:opacity-50 hover:bg-amber-100"
            disabled={bulkPending || allSymbols.length === 0}
            title="Full D+1h+15m re-fetch (reset) para todos los tickers"
            onClick={handleResetBarras}
          >
            {bulkPending ? "…" : "Reset barras"}
          </button>
        </div>
      }
    >
      {bulkMessage && <p className="text-green-800 mb-2">{bulkMessage}</p>}
      {bulkError && <p className="text-red-700 mb-2">{bulkError}</p>}
      {maintenanceError && <p className="text-red-700 mb-2">{maintenanceError}</p>}
      {!maintenanceLoading && maintenanceAlert && (
        <div
          className={`mb-3 rounded border px-2.5 py-2 text-xs leading-snug ${
            maintenanceAlert.kind === "error"
              ? "border-red-200 bg-red-50 text-red-900"
              : maintenanceAlert.kind === "warn"
                ? "border-amber-200 bg-amber-50 text-amber-950"
                : maintenanceAlert.kind === "running"
                  ? "border-amber-200 bg-amber-50 text-amber-900"
                  : maintenanceAlert.kind === "none"
                    ? "border-gray-200 bg-gray-50 text-gray-700"
                    : "border-emerald-200 bg-emerald-50 text-emerald-950"
          }`}
        >
          <p className="font-semibold">{maintenanceAlert.title}</p>
          <p className="mt-0.5">{maintenanceAlert.body}</p>
        </div>
      )}
      {maintenanceLoading && (
        <p className="text-gray-500 mb-2">Cargando resultado bars/refresh…</p>
      )}
      {tickers.length === 0 ? (
        <p className="text-gray-500 leading-snug">
          No hay tickers en el catálogo. Agrega símbolos en{" "}
          <a href="/config/tickers" className="underline">
            Configuración → Tickers
          </a>
          .
        </p>
      ) : (
        <ul className="divide-y divide-gray-100 border border-gray-100 rounded overflow-hidden">
          {tickers.map((ticker, index) => {
            const row = rows[ticker.symbol] ?? rowFromPersisted(ticker);
            const symbolUpper = ticker.symbol.toUpperCase();
            const maintenance: DailyMaintenanceTickerInfo | undefined =
              maintenanceBySymbol.get(symbolUpper) ??
              tickerBarRequestFromSession(ticker.symbol, maintenanceStatus, {
                ctxReady: row.status === "ready",
                barSucceededLocally: barOkToday.has(symbolUpper),
              });
            const maintenanceDetail = formatMaintenanceTickerDetail(maintenance);
            const pending = Boolean(rowPending[ticker.symbol]) || bulkPending;
            const isLastFavorite =
              ticker.isFavorite &&
              (index === tickers.length - 1 || !tickers[index + 1]?.isFavorite);

            return (
              <li
                key={ticker.symbol}
                className={`px-2 py-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 bg-white${
                  isLastFavorite && index < tickers.length - 1
                    ? " border-b-2 border-investep-gold/40"
                    : ""
                }`}
              >
                <div className="min-w-0 flex flex-wrap items-baseline gap-x-2 gap-y-1 flex-1">
                  {ticker.isFavorite && (
                    <span className="text-investep-gold text-xs" title="Favorito">
                      ★
                    </span>
                  )}
                  <span className="font-semibold text-investep-navy text-sm">{ticker.symbol}</span>
                  {ticker.name && <span className="text-gray-500 text-xs">{ticker.name}</span>}
                  {maintenance ? (
                    <span
                      className={`inline-block text-xs px-2 py-0.5 rounded ${maintenanceOutcomeClass(maintenance.outcome)}`}
                      title="bar-request result (GlobalContext dailyMaintenanceResult)"
                    >
                      {maintenanceOutcomeLabel(maintenance.outcome, maintenance)}
                    </span>
                  ) : !maintenanceLoading ? (
                    <span className="inline-block text-xs px-2 py-0.5 rounded bg-gray-50 text-gray-500">
                      Sin bar-request hoy
                    </span>
                  ) : null}
                  <span
                    className={`inline-block text-xs px-2 py-0.5 rounded ${financeAiStatusClass(row.status)}`}
                    title="TickerContext.status en Dynamo (Consultar AWS)"
                  >
                    Ctx: {financeAiStatusLabel(row.status)}
                  </span>
                  {maintenanceDetail && (
                    <span className="text-xs text-gray-600 w-full sm:w-auto">
                      Barras: {maintenanceDetail}
                    </span>
                  )}
                  <span className="text-xs text-gray-600 w-full sm:w-auto">
                    Último en historia: {row.historyLabel ?? "—"}
                  </span>
                  {row.historyDetail.length > 0 && (
                    <span className="text-xs text-gray-400 w-full">
                      {row.historyDetail.join(" · ")}
                    </span>
                  )}
                  {row.error && (
                    <span className="text-xs text-red-700 w-full">{row.error}</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <button
                    type="button"
                    className={TICKER_BTN}
                    disabled={pending}
                    title="Incremental bar refresh for this ticker"
                    onClick={() => barOne(ticker)}
                  >
                    {pending ? "Getting…" : "Get Latest Prices"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </CollapsibleResultSection>
  );
}
