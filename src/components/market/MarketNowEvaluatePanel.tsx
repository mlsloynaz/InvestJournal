"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { tradingDateEt } from "@/lib/live-session-window";
import { CollapsibleResultSection } from "@/components/gestion/CollapsibleResultSection";
import { StrategyChecklistBlock } from "@/components/gestion/MarketNowStrategyResults";
import {
  checkMarketNowEvaluation,
  getConfiguredEvaluateStrategyIds,
  startMarketNowEvaluation,
  type MarketNowEvalStatus,
  type MarketNowEvaluationMode,
  type MarketNowEvaluationTickerResult,
} from "@/server/actions/finance-ai";
import {
  filterStrategyFits,
  STRATEGY_CANONICAL_NAMES,
  strategyEvalContextFromChecklist,
} from "@/lib/strategy-display";

type EvaluateTickerRow = {
  symbol: string;
  name: string | null;
};

type Props = {
  evaluateTickers: EvaluateTickerRow[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

function currentTimeEtInput(): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const hour = parts.find((p) => p.type === "hour")?.value ?? "09";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
  return `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
}

function defaultSelectedSymbols(tickers: EvaluateTickerRow[]): string[] {
  return [...new Set(tickers.map((t) => t.symbol.trim().toUpperCase()).filter(Boolean))];
}

const CONFIG_CAMBIAR_LINK =
  "inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-semibold text-investep-navy bg-investep-gold/30 border border-investep-gold/70 underline decoration-investep-navy/40 underline-offset-2 hover:bg-investep-gold/55 hover:border-investep-gold hover:decoration-investep-navy transition-colors";

function ConfigTickersHint({ tickers }: { tickers: EvaluateTickerRow[] }) {
  if (tickers.length === 0) {
    return (
      <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-2.5 py-2">
        Sin tickers Movimientos Long. Marcalos en{" "}
        <Link href="/config/tickers" className="underline font-medium">
          Config &gt; Tickers &gt; Movimientos Long
        </Link>
        .
      </p>
    );
  }

  const labels = tickers.map((t) => t.symbol.trim().toUpperCase()).join(", ");

  return (
    <p className="text-[11px] text-gray-600">
      Tickers (Movimientos Long): {labels}
      {" | "}
      <Link href="/config/tickers" className={CONFIG_CAMBIAR_LINK}>
        cambiar
      </Link>
    </p>
  );
}

function ConfigStrategiesHint({
  strategyIds,
  loading,
}: {
  strategyIds: string[];
  loading?: boolean;
}) {
  if (loading) {
    return <p className="text-[11px] text-gray-500">Cargando estrategias desde Config AWS...</p>;
  }

  if (strategyIds.length === 0) {
    return (
      <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-2.5 py-2">
        Sin estrategias configuradas. Elige playbooks en{" "}
        <Link href="/config/aws" className="underline font-medium">
          Config AWS
        </Link>
        .
      </p>
    );
  }

  return (
    <p className="text-[11px] text-gray-600">
      Estrategias (Config AWS):{" "}
      {strategyIds.map((id) => STRATEGY_CANONICAL_NAMES[id] ?? id).join(", ")}
      {" | "}
      <Link href="/config/aws" className={CONFIG_CAMBIAR_LINK}>
        cambiar
      </Link>
    </p>
  );
}

function EvalStatusBadge({ status, label }: { status: MarketNowEvalStatus; label: string }) {
  if (status === "idle" || !label) return null;

  const className =
    status === "running"
      ? "border-amber-300 bg-amber-50 text-amber-900"
      : status === "complete"
        ? "border-emerald-300 bg-emerald-50 text-emerald-900"
        : "border-red-300 bg-red-50 text-red-900";

  return (
    <p className={`text-xs font-medium rounded border px-2 py-1 inline-block ${className}`}>
      {label}
    </p>
  );
}

function TickerStrategyResults({
  row,
  strategyIds,
}: {
  row: MarketNowEvaluationTickerResult;
  strategyIds: string[];
}) {
  if (!row.success) {
    return (
      <li className="rounded-lg border border-red-200 bg-red-50/50 px-3 py-2">
        <p className="font-mono font-semibold text-sm text-investep-navy">{row.symbol}</p>
        <p className="text-xs text-red-800 mt-1">{row.error ?? "Error al evaluar"}</p>
      </li>
    );
  }

  const analysis = row.analysis;
  const strategies = filterStrategyFits(row.strategies, strategyIds);
  const sessionGap = analysis?.sessionGap ?? analysis?.strategyChecklist?.sessionGap;
  const evalContext = strategyEvalContextFromChecklist(analysis?.strategyChecklist, {
    evaluatedAt: analysis?.updatedAt,
    tradeDate: analysis?.date,
    phase: analysis?.assessmentPhase ?? "NOW",
    dataCutoffEt: analysis?.dataCutoffEt ?? analysis?.simulationTimeEt,
  });

  return (
    <li className="rounded-lg border border-gray-200 bg-white px-3 py-2">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="font-mono font-semibold text-sm text-investep-navy">{row.symbol}</span>
        {analysis?.dataCutoffEt && (
          <span className="text-[10px] text-gray-500">datos hasta {analysis.dataCutoffEt}</span>
        )}
        {analysis?.simulationTimeEt && (
          <span className="text-[10px] text-gray-500">sim {analysis.simulationTimeEt} ET</span>
        )}
      </div>
      {strategies.length === 0 ? (
        <p className="text-xs text-gray-500 mt-2">
          Sin resultados para las estrategias seleccionadas.
        </p>
      ) : (
        <StrategyChecklistBlock
          strategies={strategies}
          sessionGap={sessionGap}
          evalContext={evalContext}
          symbol={row.symbol}
          strategyIdsFilter={strategyIds}
        />
      )}
    </li>
  );
}

export function MarketNowEvaluatePanel({
  evaluateTickers,
  open: openProp,
  onOpenChange,
}: Props) {
  const [openLocal, setOpenLocal] = useState(false);
  const open = openProp ?? openLocal;
  const setOpen = onOpenChange ?? setOpenLocal;

  const [loadedStrategyIds, setLoadedStrategyIds] = useState<string[]>([]);
  const [strategiesLoading, setStrategiesLoading] = useState(false);
  const strategiesLoadedRef = useRef(false);

  const strategyIds = useMemo(
    () => [...new Set(loadedStrategyIds.map((id) => id.trim()).filter(Boolean))],
    [loadedStrategyIds]
  );
  const symbols = useMemo(() => defaultSelectedSymbols(evaluateTickers), [evaluateTickers]);

  const [evalMode, setEvalMode] = useState<MarketNowEvaluationMode>("now");
  const [tradeDate, setTradeDate] = useState(() => tradingDateEt());
  const [timeEt, setTimeEt] = useState(() => currentTimeEtInput());
  const [skipBars, setSkipBars] = useState(false);
  const [checkPending, startCheckTransition] = useTransition();
  const [evalPending, startEvalTransition] = useTransition();
  const pending = checkPending || evalPending;
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [results, setResults] = useState<MarketNowEvaluationTickerResult[] | null>(null);
  const [evalStatus, setEvalStatus] = useState<MarketNowEvalStatus>("idle");
  const [statusLabel, setStatusLabel] = useState("");
  const [lastRunLabel, setLastRunLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!open || strategiesLoadedRef.current) return;
    strategiesLoadedRef.current = true;
    setStrategiesLoading(true);
    void getConfiguredEvaluateStrategyIds()
      .then((ids) => setLoadedStrategyIds(ids))
      .finally(() => setStrategiesLoading(false));
  }, [open]);

  const applyCheckPayload = useCallback(
    (
      payload: Awaited<ReturnType<typeof checkMarketNowEvaluation>>,
      modeLabel?: string
    ) => {
      setEvalStatus(payload.status);
      setStatusLabel(payload.statusLabel);
      if (payload.results) {
        setResults(payload.results);
      }
      if (modeLabel) {
        setLastRunLabel(modeLabel);
      } else if (payload.tradeDate) {
        setLastRunLabel(
          payload.timeEt
            ? `${payload.tradeDate} ${payload.timeEt} ET`
            : `Now - ${payload.tradeDate}`
        );
      }
      if (payload.notFound && payload.status === "idle") {
        setMessage("Sin resultado almacenado en AWS. Pulsa Evaluate para iniciar.");
      }
    },
    []
  );

  const runCheckResult = useCallback(() => {
    setError(null);
    setMessage(null);
    startCheckTransition(async () => {
      const payload = await checkMarketNowEvaluation({
        symbols,
        strategyIds,
      });
      if (!payload.success) {
        setError(payload.error ?? "Check Result fallo");
        return;
      }
      applyCheckPayload(payload);
      if (payload.error) {
        setError(payload.error);
      }
    });
  }, [symbols, strategyIds, applyCheckPayload]);

  const runEvaluation = useCallback(() => {
    setError(null);
    setMessage(null);
    startEvalTransition(async () => {
      const payload = await startMarketNowEvaluation({
        symbols,
        strategyIds,
        mode: evalMode,
        tradeDate: evalMode === "at" ? tradeDate : undefined,
        timeEt: evalMode === "at" ? timeEt : undefined,
        updateBars: !skipBars,
      });
      if (!payload.success && !payload.results?.length) {
        setError(payload.error ?? "Evaluacion fallo");
        setEvalStatus(payload.status);
        setStatusLabel(payload.statusLabel);
        return;
      }

      setEvalStatus(payload.status);
      setStatusLabel(payload.statusLabel);
      if (payload.results?.length) {
        setResults(payload.results);
      }
      setLastRunLabel(
        evalMode === "now"
          ? `Now - ${payload.tradeDate ?? tradingDateEt()}`
          : `${payload.tradeDate} ${payload.timeEt} ET`
      );
      const parts = [payload.message];
      if (payload.barRequestMessage) parts.push(payload.barRequestMessage);
      setMessage(parts.filter(Boolean).join(" | "));
      if (payload.error && payload.results?.length) {
        setError(payload.error);
      }
    });
  }, [symbols, strategyIds, evalMode, tradeDate, timeEt, skipBars]);

  const canRun = symbols.length > 0 && strategyIds.length > 0;

  return (
    <CollapsibleResultSection
      id="journey-result-now"
      title="Result Now"
      subtitle="Evaluate: POST /tickers/check · Check Result: GET /tickers/check/result"
      open={open}
      onOpenChange={setOpen}
      borderClass="border-emerald-200"
      headerClass="bg-emerald-50/80"
      headerExtra={
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            suppressHydrationWarning
            className="text-xs px-2 py-1 rounded border border-gray-400 text-gray-800 disabled:opacity-50 font-medium bg-white"
            disabled={pending || !canRun}
            onClick={() => void runCheckResult()}
          >
            {checkPending ? "Consultando..." : "Check Result"}
          </button>
          <button
            type="button"
            suppressHydrationWarning
            className="text-xs px-2 py-1 rounded border border-emerald-700 text-emerald-900 disabled:opacity-50 font-medium"
            disabled={pending || !canRun}
            onClick={() => void runEvaluation()}
          >
            {evalPending ? "Evaluando..." : "Evaluate"}
          </button>
        </div>
      }
    >
      <div className="space-y-3 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <EvalStatusBadge status={evalStatus} label={statusLabel} />
          {evalStatus === "running" && (
            <span className="text-[11px] text-gray-500">
              Evaluacion en curso en AWS…
            </span>
          )}
        </div>

        <ConfigStrategiesHint strategyIds={strategyIds} loading={strategiesLoading} />

        <ConfigTickersHint tickers={evaluateTickers} />

        <div className="rounded-lg border border-gray-200 bg-gray-50/80 px-3 py-2.5 space-y-2">
          <p className="text-xs font-medium text-investep-navy">Momento de evaluacion</p>
          <div className="flex flex-wrap gap-3 text-xs">
            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="market-now-eval-mode"
                checked={evalMode === "now"}
                disabled={pending}
                onChange={() => setEvalMode("now")}
              />
              Now
            </label>
            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="market-now-eval-mode"
                checked={evalMode === "at"}
                disabled={pending}
                onChange={() => setEvalMode("at")}
              />
              Fecha y hora
            </label>
          </div>
          {evalMode === "at" && (
            <div className="flex flex-wrap items-end gap-2 pt-1">
              <label className="text-xs text-gray-600">
                Fecha (ET)
                <input
                  type="date"
                  value={tradeDate}
                  disabled={pending}
                  onChange={(e) => setTradeDate(e.target.value)}
                  className="block mt-0.5 border border-gray-300 rounded px-2 py-1 text-sm"
                />
              </label>
              <label className="text-xs text-gray-600">
                Hora (ET)
                <input
                  type="time"
                  value={timeEt}
                  disabled={pending}
                  step={60}
                  onChange={(e) => setTimeEt(e.target.value)}
                  className="block mt-0.5 border border-gray-300 rounded px-2 py-1 text-sm"
                />
              </label>
            </div>
          )}
          <label className="flex items-center gap-2 text-[11px] text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={skipBars}
              disabled={pending}
              onChange={(e) => setSkipBars(e.target.checked)}
            />
            Omitir actualizacion de barras (solo evaluar con barras actuales)
          </label>
        </div>
      </div>

      {lastRunLabel && (
        <p className="text-xs text-emerald-900 mb-2">
          <span className="font-medium text-investep-navy">Ultima evaluacion:</span> {lastRunLabel}
        </p>
      )}
      {message && <p className="text-xs text-emerald-800 mb-2">{message}</p>}
      {error && <p className="text-xs text-red-700 mb-2">{error}</p>}

      {results && results.length > 0 && (
        <ul className="space-y-3">
          {results.map((row) => (
            <TickerStrategyResults
              key={row.symbol}
              row={row}
              strategyIds={strategyIds}
            />
          ))}
        </ul>
      )}

      {!pending && !results?.length && canRun && evalStatus === "idle" && (
        <p className="text-xs text-gray-500">
          Pulsa <strong>Check Result</strong> para ver el ultimo estado o{" "}
          <strong>Evaluate</strong> para iniciar una evaluacion.
        </p>
      )}
    </CollapsibleResultSection>
  );
}
