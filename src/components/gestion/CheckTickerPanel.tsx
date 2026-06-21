"use client";

import { useCallback, useMemo, useState } from "react";
import type { FinanceAiPremarketAnalysis } from "@/lib/finance-ai-types";
import { formatFinanceAiTimestamp } from "@/lib/format-datetime";
import { tickerEvalResultForDisplay } from "@/lib/premarket-display";
import { filterStrategyFits, isStrategyFullyMet } from "@/lib/strategy-display";
import {
  CollapsibleResultSection,
  TickerResultDetails,
} from "@/components/gestion/CollapsibleResultSection";
import { PremarketBaselineSummary } from "@/components/gestion/MarketAiTickerTable";
import { StrategyGoldMedal } from "@/components/gestion/StrategyGoldMedal";
import { checkFinanceAiTicker } from "@/server/actions/finance-ai";

type Props = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function CheckTickerPanel({ open = true, onOpenChange }: Props) {
  const [openLocal, setOpenLocal] = useState(open);
  const isOpen = onOpenChange ? open : openLocal;
  const setOpen = onOpenChange ?? setOpenLocal;

  const [symbolInput, setSymbolInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FinanceAiPremarketAnalysis | null>(null);
  const [lastSymbol, setLastSymbol] = useState<string | null>(null);

  const runCheck = useCallback(async () => {
    const sym = symbolInput.trim().toUpperCase();
    if (!sym) {
      setError("Escribe un símbolo.");
      return;
    }
    setLoading(true);
    setError(null);
    const response = await checkFinanceAiTicker(sym);
    if (!response.success || !response.analysis) {
      setError(response.error ?? "No se pudo evaluar el ticker.");
      setLoading(false);
      return;
    }
    setResult(response.analysis);
    setLastSymbol(sym);
    setLoading(false);
  }, [symbolInput]);

  const display = useMemo(
    () => (result ? tickerEvalResultForDisplay(result) : null),
    [result]
  );
  const hasFullyMetStrategy = useMemo(() => {
    const strategies = display?.strategyChecklist?.strategies ?? [];
    return filterStrategyFits(strategies).some(isStrategyFullyMet);
  }, [display]);
  const contextNote =
    result?.contextSource === "fetched"
      ? "TickerContext creado e inicializado en AWS."
      : result?.contextSource === "refreshed"
        ? "Barras actualizadas (incremental) antes de evaluar."
        : result?.contextSource === "stored"
          ? "Contexto desde TickerContext guardado."
          : null;

  return (
    <CollapsibleResultSection
      id="journey-check-ticker"
      title="Check Ticker"
      subtitle="Estrategias · barras + eval · guardado en AWS"
      open={isOpen}
      onOpenChange={setOpen}
      borderClass="border-teal-200"
      headerClass="bg-teal-50/80"
    >
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <input
          type="text"
          suppressHydrationWarning
          value={symbolInput}
          onChange={(e) => setSymbolInput(e.target.value.toUpperCase())}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !loading) void runCheck();
          }}
          placeholder="Ej. NVDA"
          className="text-sm border border-gray-300 rounded px-2 py-1 w-28 uppercase font-mono"
          maxLength={12}
          disabled={loading}
          aria-label="Símbolo del ticker"
        />
        <button
          type="button"
          suppressHydrationWarning
          className="text-xs px-3 py-1 rounded bg-teal-700 text-white font-medium disabled:opacity-50"
          disabled={loading}
          onClick={() => void runCheck()}
        >
          {loading ? "Evaluando…" : "Check"}
        </button>
        {result?.persisted && (
          <span className="text-[10px] text-teal-800 bg-teal-100 px-1.5 py-0.5 rounded">
            guardado
          </span>
        )}
      </div>

      {error && <p className="text-xs text-red-700 mb-2">{error}</p>}

      {loading && (
        <p className="text-xs text-gray-500">Actualizando barras y evaluando estrategias…</p>
      )}

      {!loading && result && lastSymbol && display && (
        <div className="space-y-2">
          {result.updatedAt && (
            <p className="text-xs text-gray-600">
              <span className="font-medium text-investep-navy">Evaluado:</span>{" "}
              {formatFinanceAiTimestamp(result.updatedAt)}
              {contextNote ? ` · ${contextNote}` : ""}
            </p>
          )}
          <TickerResultDetails
            symbol={lastSymbol}
            name={null}
            defaultOpen
            medal={hasFullyMetStrategy ? <StrategyGoldMedal className="text-lg" /> : undefined}
            badge={
              result.bias ? (
                <span className="text-[10px] font-normal text-teal-800">{result.bias}</span>
              ) : undefined
            }
          >
            <PremarketBaselineSummary analysis={display} symbol={lastSymbol} />
          </TickerResultDetails>
        </div>
      )}

      {!loading && !result && !error && (
        <p className="text-xs text-gray-500">
          Escribe un ticker y pulsa Check. Actualiza barras, evalúa estrategias y guarda el
          resultado en AWS (TickerContext + PremarketAnalysis).
        </p>
      )}
    </CollapsibleResultSection>
  );
}
