"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CollapsibleResultSection,
  TickerResultDetails,
} from "@/components/gestion/CollapsibleResultSection";
import { Bb15DirectionArrow } from "@/components/gestion/StrategyMetDirectionArrow";
import { TickerCollapsedSummaryBadge } from "@/components/gestion/MovementTickerCollapsedBadge";
import { StrategyRequirementsList } from "@/components/gestion/StrategyRequirementsList";
import {
  E03_MANDATORY_RULE_KEYS,
  E03_STRATEGY_ID,
  isE03MandatoryItem,
  isE03StrategyFullyMet,
  partitionE03OutsideRows,
  resolveE03CollapsedTickerBadge,
  resolveE03DecisionTiming,
  resolveE03Direction,
  resolveE03DirectionLabel,
  resolveE03MandatoryStrategyChecks,
  resolveE03ReferencePrice,
  type E03OutsideTickerRow,
} from "@/lib/e03-outside-display";
import {
  formatStrategyIdLabel,
  strategyRulesForDisplay,
} from "@/lib/strategy-display";
import { buildTestingCriteriasHref } from "@/lib/testing-criterias-link";
import { waitForMov15mTriggerResult } from "@/lib/mov15m-poll-wait";
import { mov15mPollingToApiPayload, defaultMov15mPollingParams } from "@/lib/mov15m-polling";
import { Mov15mEvaluateControls } from "@/components/gestion/Mov15mEvaluateControls";
import { Mov15mPollingConfigButton } from "@/components/gestion/Mov15mPollingConfigButton";
import { Mov15mPollingConfigModal } from "@/components/gestion/Mov15mPollingConfigModal";
import { loadE03OutsideBatch } from "@/server/actions/e03-outside-status";
import { triggerFinanceAiMov15mCheck } from "@/server/actions/finance-ai";

type Props = {
  financeAiConfigured?: boolean;
  configWatchlist?: string[];
  initialRows?: E03OutsideTickerRow[];
  persistedAt?: string | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  standalone?: boolean;
  panelId?: string;
};

function filterRowsForWatchlist(
  rows: E03OutsideTickerRow[],
  symbols: string[]
): E03OutsideTickerRow[] {
  const allow = new Set(symbols.map((s) => s.trim().toUpperCase()));
  return rows.filter((row) => allow.has(row.symbol.trim().toUpperCase()));
}

function E03DirectionBlock({ row }: { row: E03OutsideTickerRow }) {
  const strategy = row.strategy;
  if (!strategy) return null;
  const direction = resolveE03Direction(strategy);
  const label = resolveE03DirectionLabel(strategy);
  const dirClass =
    direction === "CALL"
      ? "text-green-700"
      : direction === "PUT"
        ? "text-red-600"
        : "text-gray-500";

  return (
    <div className="text-[10px] mt-2 flex flex-wrap items-center gap-1.5">
      <span className="text-gray-600">Propuesta:</span>
      <Bb15DirectionArrow direction={direction} className="text-lg" />
      <span className={`font-bold ${dirClass}`}>{label}</span>
      {strategy.variantName ? (
        <span className="text-[9px] text-gray-500">({strategy.variantName})</span>
      ) : null}
    </div>
  );
}

function E03TickerBody({ row }: { row: E03OutsideTickerRow }) {
  const strategy = row.strategy;
  if (!row.success || !strategy) {
    return (
      <p className="text-xs text-gray-500 mt-1">
        {row.error ?? "Sin evaluación E03 — pulsa Evaluate."}
      </p>
    );
  }

  const mandatoryRules = strategyRulesForDisplay(strategy).filter((r) =>
    isE03MandatoryItem(r.item)
  );
  const supportRules = strategyRulesForDisplay(strategy).filter(
    (r) => !isE03MandatoryItem(r.item)
  );

  return (
    <div className="space-y-2 mt-1 text-[10px]">
      <E03DirectionBlock row={row} />
      <p className="text-gray-600">
        {formatStrategyIdLabel(E03_STRATEGY_ID)}
        {strategy.variantId ? ` · ${strategy.variantId}` : null}
        {" · "}
        <span className="font-semibold tabular-nums">
          {row.mandatoryMet}/{row.mandatoryTotal}
        </span>{" "}
        obligatorios
      </p>
      {mandatoryRules.length > 0 && (
        <div>
          <p className="text-[9px] font-semibold text-gray-700 mb-0.5">Obligatorios E03</p>
          <StrategyRequirementsList
            rules={mandatoryRules}
            highlightRuleKey="bb_exposure"
          />
        </div>
      )}
      {supportRules.length > 0 && (
        <div>
          <p className="text-[9px] font-semibold text-gray-500 mb-0.5">Soporte</p>
          <div className="opacity-90">
            <StrategyRequirementsList rules={supportRules} />
          </div>
        </div>
      )}
    </div>
  );
}

function e03TickerBadge(row: E03OutsideTickerRow) {
  if (!row.success || !row.strategy) return null;
  const direction = resolveE03Direction(row.strategy);
  return (
    <TickerCollapsedSummaryBadge
      price={resolveE03ReferencePrice(row)}
      directionArrow={<Bb15DirectionArrow direction={direction} />}
      timing={resolveE03DecisionTiming(row)}
      checks={resolveE03MandatoryStrategyChecks(row.strategy)}
      progress={resolveE03CollapsedTickerBadge(row)}
    />
  );
}

export function E03OutsideBolingerPanel({
  financeAiConfigured = true,
  configWatchlist = [],
  initialRows = [],
  persistedAt = null,
  open: openProp,
  onOpenChange,
  standalone = false,
  panelId = "journey-e03-outside",
}: Props) {
  const [openLocal, setOpenLocal] = useState(() => standalone);
  const open = openProp ?? openLocal;
  const setOpen = onOpenChange ?? setOpenLocal;

  const configSymbols = useMemo(
    () =>
      [...new Set((configWatchlist ?? []).map((s) => s.trim().toUpperCase()).filter(Boolean))].sort(
        (a, b) => a.localeCompare(b)
      ),
    [configWatchlist]
  );

  const [pollingParams, setPollingParams] = useState(() =>
    defaultMov15mPollingParams(configSymbols)
  );
  const [pollingModalOpen, setPollingModalOpen] = useState(false);

  useEffect(() => {
    setPollingParams((prev) => ({
      ...prev,
      tickersForPolling:
        prev.tickersForPolling.length > 0 ? prev.tickersForPolling : configSymbols,
    }));
  }, [configSymbols]);

  const [loading, setLoading] = useState(false);
  const [pollProgress, setPollProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState(() => filterRowsForWatchlist(initialRows, configSymbols));
  const [lastLoadedAt, setLastLoadedAt] = useState<string | null>(persistedAt);

  const runEvaluate = useCallback(async () => {
    if (!financeAiConfigured || configSymbols.length === 0) return;
    setLoading(true);
    setError(null);
    setPollProgress(null);
    const tickers =
      pollingParams.tickersForPolling?.length
        ? pollingParams.tickersForPolling
        : configSymbols;
    const apiPayload = mov15mPollingToApiPayload({ ...pollingParams, tickersForPolling: tickers });
    const assess = await triggerFinanceAiMov15mCheck({
      ...apiPayload,
      mode: "full_assessment_inside_b15m",
      manual: true,
    });
    const waited = await waitForMov15mTriggerResult(assess, setPollProgress);
    if (!waited.ok) {
      setError(
        waited.error ??
          (pollingParams.poll1mEnabled ? "Error en polling 1m (mov15m)" : "Error en evaluación mov15m")
      );
      setLoading(false);
      setPollProgress(null);
      return;
    }
    setPollProgress(null);
    const result = await loadE03OutsideBatch({
      symbols: tickers,
      fresh: true,
    });
    if (!result.success) {
      setError(result.error ?? "Error cargando E03");
      setLoading(false);
      return;
    }
    setRows(result.rows);
    setLastLoadedAt(result.persistedAt ?? new Date().toISOString());
    setLoading(false);
  }, [configSymbols, financeAiConfigured, pollingParams]);

  const loadRows = useCallback(
    async (fresh: boolean) => {
      if (configSymbols.length === 0) return;
      if (fresh && !financeAiConfigured) return;
      setLoading(true);
      setError(null);
      setPollProgress(null);
      const result = await loadE03OutsideBatch({ symbols: configSymbols, fresh });
      if (!result.success) {
        setError(result.error ?? "Error cargando E03");
        setLoading(false);
        return;
      }
      setRows(result.rows);
      setLastLoadedAt(result.persistedAt ?? new Date().toISOString());
      setLoading(false);
    },
    [configSymbols, financeAiConfigured]
  );

  const { met: metRows, notMet: notMetRows } = partitionE03OutsideRows(rows);
  const visibleSymbols = rows.map((r) => r.symbol);
  const e03FullHref =
    visibleSymbols.length > 0
      ? buildTestingCriteriasHref({ symbols: visibleSymbols, strategyId: E03_STRATEGY_ID })
      : null;

  const subtitle =
    configSymbols.length === 0
      ? "Marca tickers en Config → Tickers → Movimiento 15M"
      : lastLoadedAt
        ? `${configSymbols.length} candidatos · ${rows.length} en panel · ${formatStrategyIdLabel(E03_STRATEGY_ID)}`
        : `${configSymbols.length} candidatos Movimiento 15M · pulsa Evaluate o See Latest`;

  const renderTickerRow = (row: E03OutsideTickerRow) => (
    <TickerResultDetails key={row.symbol} symbol={row.symbol} badge={e03TickerBadge(row)}>
      <E03TickerBody row={row} />
    </TickerResultDetails>
  );

  return (
    <CollapsibleResultSection
      id={panelId}
      title={<>Movimientos -15M · Outside Bolinger</>}
      subtitle={subtitle}
      open={open}
      onOpenChange={setOpen}
      collapsible
      borderClass="border-amber-200"
      headerClass="bg-amber-50/60"
      bodyClassName="px-4 py-3 bg-amber-50/20"
      headerExtra={
        configSymbols.length > 0 ? (
          <>
            {financeAiConfigured && e03FullHref && (
              <Link
                href={e03FullHref}
                className="text-[10px] px-2 py-1 rounded border border-gray-400 text-gray-700 bg-white hover:bg-gray-50"
                title="Testing criterias — E03 checklist completo"
              >
                E03 tests
              </Link>
            )}
            {financeAiConfigured ? (
              <button
                type="button"
                className="text-[10px] px-2 py-1 rounded border border-sky-600 text-sky-800 bg-sky-50 disabled:opacity-50"
                onClick={() => void runEvaluate()}
                disabled={loading}
                title="Evaluate — E03 checklist (sin 1m polling por defecto)"
              >
                {loading ? "Evaluating…" : "Evaluate"}
              </button>
            ) : null}
            {financeAiConfigured && configSymbols.length > 0 ? (
              <Mov15mPollingConfigButton
                onClick={() => setPollingModalOpen(true)}
                disabled={loading}
                variant="outside"
              />
            ) : null}
            <button
              type="button"
              className="text-[10px] px-2 py-1 rounded border border-gray-400 text-gray-700 bg-white disabled:opacity-50"
              onClick={() => void loadRows(false)}
              disabled={loading}
              title="See Latest — última evaluación E03 guardada en MySQL (sin AWS)"
            >
              {loading ? "Loading…" : "See Latest"}
            </button>
          </>
        ) : null
      }
    >
      {financeAiConfigured && configSymbols.length > 0 && (
        <Mov15mEvaluateControls
          value={pollingParams}
          onChange={setPollingParams}
          disabled={loading}
        />
      )}
      <Mov15mPollingConfigModal
        open={pollingModalOpen}
        onClose={() => setPollingModalOpen(false)}
        configSymbols={configSymbols}
        value={pollingParams}
        onChange={setPollingParams}
        variant="outside"
      />
      {!financeAiConfigured && (
        <p className="text-xs text-amber-900">FinanceAI no configurado.</p>
      )}
      {financeAiConfigured && configSymbols.length === 0 && (
        <p className="text-xs text-gray-500">
          Sin tickers Movimiento 15M — márcalos en Config → Tickers y guarda.
        </p>
      )}
      {financeAiConfigured && configSymbols.length > 0 && (
        <p className="text-[10px] text-gray-600 mb-2">
          Panel <strong>Outside</strong> ={" "}
          <strong>{formatStrategyIdLabel(E03_STRATEGY_ID)}</strong> (E03), no reglas BB15 inside/outside
          @ campana. Obligatorios: {E03_MANDATORY_RULE_KEYS.join(", ")}.
        </p>
      )}
      {financeAiConfigured && configSymbols.length > 0 && rows.length === 0 && !loading && (
        <p className="text-xs text-gray-500 mb-2">
          Sin datos cargados. Pulsa <strong>See Latest</strong> (MySQL) o{" "}
          <strong>Evaluate</strong> (job AWS).
        </p>
      )}
      {loading && rows.length === 0 && (
        <p className="text-xs text-gray-500 mb-2">Cargando checklist E03…</p>
      )}
      {pollProgress && <p className="text-xs text-sky-800 mb-2">{pollProgress}</p>}
      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
      {!loading && !error && configSymbols.length > 0 && rows.length === 0 && (
        <p className="text-xs text-gray-500">
          Sin resultados E03 ({configSymbols.length} candidatos Movimiento 15M).
        </p>
      )}
      {!error && rows.length > 0 && (
        <div className="space-y-3">
          {metRows.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold text-green-800 border-b border-green-100 pb-0.5">
                E03 cumplida ({metRows.length})
              </p>
              {metRows.map(renderTickerRow)}
            </div>
          )}
          {notMetRows.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold text-gray-600 border-b border-gray-200 pb-0.5">
                Parcial ({notMetRows.length})
              </p>
              {notMetRows.map(renderTickerRow)}
            </div>
          )}
        </div>
      )}
    </CollapsibleResultSection>
  );
}
