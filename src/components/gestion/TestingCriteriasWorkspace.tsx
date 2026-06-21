"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  resolveTestingTickerOutcome,
  summarizeTestingOutcomes,
  type TestingTickerOutcome,
} from "@/lib/testing-criterias-result";
import type { TestingCriteriaCatalog } from "@/server/actions/testing-criterias";
import {
  loadTestingCriteriasCatalog,
  runTestingCriteriaBatch,
} from "@/server/actions/testing-criterias";
import type { TestingCriteriasDeepLink } from "@/lib/testing-criterias-link";
import {
  filterChecksByTimeframe,
  findCheckById,
  findCheckByRule,
  groupStrategyRequirements,
  rulesApiPayload,
  timeframeLabel,
  TIMEFRAME_FILTER_OPTIONS,
  BB15_STRATEGY_ID,
  type TestingCriteriaCheck,
  type TestingTimeframe,
} from "@/lib/testing-criterias-registry";
import type { TestingCriteriaSymbolResult } from "@/server/actions/testing-criterias";
import { tradingDateEt } from "@/lib/live-session-window";

type TickerRow = {
  symbol: string;
  name: string | null;
};

type Props = {
  tickers: TickerRow[];
  catalog: TestingCriteriaCatalog;
  financeAiConfigured: boolean;
  initialDeepLink?: TestingCriteriasDeepLink;
};

function StatusBadge({ outcome }: { outcome: TestingTickerOutcome }) {
  const base = "text-[10px] font-bold uppercase px-2 py-0.5 rounded border shrink-0";
  if (outcome.status === "pass") {
    return <span className={`${base} bg-green-100 text-green-800 border-green-300`}>Pass</span>;
  }
  if (outcome.status === "error") {
    return <span className={`${base} bg-red-100 text-red-800 border-red-300`}>Error</span>;
  }
  return <span className={`${base} bg-orange-100 text-orange-900 border-orange-300`}>Fail</span>;
}

function TestResultCard({ outcome }: { outcome: TestingTickerOutcome }) {
  const rule = outcome.ruleOutcomes[0];
  return (
    <article
      className={`rounded-lg border p-3 space-y-2 ${
        outcome.status === "pass"
          ? "border-green-200 bg-green-50/40"
          : outcome.status === "error"
            ? "border-red-200 bg-red-50/40"
            : "border-orange-200 bg-orange-50/30"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono font-semibold text-sm text-investep-navy">{outcome.symbol}</span>
        <StatusBadge outcome={outcome} />
        {outcome.contextSource && (
          <span className="text-[10px] text-gray-400">{outcome.contextSource}</span>
        )}
      </div>

      {outcome.status === "error" && outcome.error && (
        <p className="text-xs text-red-800 font-medium">{outcome.error}</p>
      )}

      {rule && (
        <div
          className={`rounded px-2 py-1.5 border text-[11px] ${
            rule.passed
              ? "border-green-100 bg-green-50/80 text-green-900"
              : rule.pending
                ? "border-gray-100 bg-gray-50 text-gray-700"
                : "border-orange-100 bg-white text-orange-950"
          }`}
        >
          <p className="font-medium">
            {rule.timeframe && (
              <span className="text-gray-400 mr-1">[{timeframeLabel(rule.timeframe)}]</span>
            )}
            {rule.label}
            {rule.ruleKey && (
              <span className="ml-1 font-mono text-[10px] text-gray-500">{rule.ruleKey}</span>
            )}
          </p>
          {rule.reason && <p className="text-[10px] text-gray-600 mt-0.5">{rule.reason}</p>}
        </div>
      )}

      {outcome.status === "pass" && outcome.executionProposal && (
        <div className="rounded px-2 py-1.5 border border-violet-200 bg-violet-50/80 text-[11px] text-violet-950">
          <p className="font-semibold uppercase text-[10px] text-violet-700 tracking-wide">Propuesta</p>
          <p className="font-medium mt-0.5">{outcome.executionProposal}</p>
          <p className="text-[10px] text-violet-800/80 mt-0.5">
            Entrada en broker si los requisitos de tendencia siguen cumpliendo (ATM, spread, vencimiento).
          </p>
        </div>
      )}

      {outcome.status === "fail" && outcome.failSummary && !rule?.reason && (
        <p className="text-xs text-orange-950">{outcome.failSummary}</p>
      )}
    </article>
  );
}

function formatCatalogLoadedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function RequirementRow({
  c,
  highlightCheckId,
  onSelectCheck,
  badge,
}: {
  c: TestingCriteriaCheck;
  highlightCheckId: string;
  onSelectCheck: (check: TestingCriteriaCheck) => void;
  badge?: string;
}) {
  const selected = c.checkId === highlightCheckId;
  const reqNum = c.requirementId?.match(/-req(\d+)$/)?.[1];
  const extId = c.requirementId?.match(/-(e\d+)$/)?.[1]?.toUpperCase();
  return (
    <li key={c.checkId}>
      <button
        type="button"
        onClick={() => onSelectCheck(c)}
        className={`w-full text-left px-2 py-1.5 border-b border-gray-50 last:border-b-0 transition-colors ${
          selected
            ? "bg-violet-50 border-l-2 border-l-violet-500"
            : "hover:bg-violet-50/40 border-l-2 border-l-transparent"
        }`}
      >
        <div className="flex items-start gap-1.5">
          <span
            className={`shrink-0 text-[9px] font-bold uppercase px-1 py-0.5 rounded ${
              selected ? "bg-violet-200 text-violet-900" : "bg-gray-100 text-gray-600"
            }`}
          >
            {timeframeLabel(c.timeframe)}
          </span>
          {badge && (
            <span className="shrink-0 text-[9px] font-bold uppercase px-1 py-0.5 rounded bg-amber-100 text-amber-900">
              {badge}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium text-investep-navy leading-snug">
              {reqNum ? (
                <span className="text-gray-400 font-mono mr-1">#{reqNum}</span>
              ) : extId ? (
                <span className="text-amber-700 font-mono mr-1">{extId}</span>
              ) : null}
              {c.label}
            </p>
            <p className="text-[10px] font-mono text-gray-500 mt-0.5">
              {c.ruleKey}
              {c.requirementId ? (
                <span className="text-gray-400"> · {c.requirementId}</span>
              ) : null}
            </p>
          </div>
        </div>
      </button>
    </li>
  );
}

function StrategyRequirementsList({
  groups,
  highlightCheckId,
  srFilter,
  onSrFilterChange,
  onSelectCheck,
  catalogMeta,
  onRefreshCatalog,
  refreshingCatalog,
}: {
  groups: ReturnType<typeof groupStrategyRequirements>;
  highlightCheckId: string;
  srFilter: string;
  onSrFilterChange: (value: string) => void;
  onSelectCheck: (check: TestingCriteriaCheck) => void;
  catalogMeta: Pick<TestingCriteriaCatalog, "source" | "sourceFiles" | "loadedAt">;
  onRefreshCatalog: () => void;
  refreshingCatalog: boolean;
}) {
  const q = srFilter.trim().toLowerCase();

  const filteredGroups = useMemo(() => {
    if (!q) return groups;
    return groups
      .map((g) => ({
        ...g,
        requirements: [
          ...g.mandatoryRequirements,
          ...g.supportRequirements,
        ].filter((c) => {
          const hay = [
            c.label,
            c.ruleKey,
            c.timeframe,
            c.strategyId,
            c.variantName,
            c.requirementId,
            timeframeLabel(c.timeframe),
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return hay.includes(q);
        }),
      }))
      .filter((g) => g.requirements.length > 0);
  }, [groups, q]);

  const totalCount = groups.reduce(
    (n, g) => n + g.mandatoryRequirements.length + g.supportRequirements.length,
    0
  );
  const visibleCount = filteredGroups.reduce((n, g) => n + g.requirements.length, 0);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <p className="text-[10px] text-gray-500 leading-snug min-w-0">
          Fuente: {catalogMeta.source}
          {catalogMeta.sourceFiles.length > 0 && (
            <span className="block font-mono truncate" title={catalogMeta.sourceFiles.join(", ")}>
              {catalogMeta.sourceFiles.join(", ")}
            </span>
          )}
          <span className="block text-gray-400">
            Actualizado {formatCatalogLoadedAt(catalogMeta.loadedAt)}
          </span>
        </p>
        <button
          type="button"
          onClick={onRefreshCatalog}
          disabled={refreshingCatalog}
          className="shrink-0 text-[10px] px-2 py-0.5 rounded border border-gray-300 bg-gray-50 disabled:opacity-50"
        >
          {refreshingCatalog ? "Actualizando…" : "Actualizar lista"}
        </button>
      </div>
      <input
        type="search"
        value={srFilter}
        onChange={(e) => onSrFilterChange(e.target.value)}
        placeholder="Filtrar SR (ruleKey, label, estrategia)…"
        className="w-full text-xs border border-gray-300 rounded px-2 py-1"
      />
      <p className="text-[10px] text-gray-500 tabular-nums">
        {visibleCount} / {totalCount} requirements · clic para probar
      </p>
      <div className="max-h-[32rem] overflow-y-auto space-y-3 pr-0.5">
        {filteredGroups.map((group) => (
          <div key={group.groupId} className="rounded border border-gray-100 overflow-hidden">
            <div className="px-2 py-1 bg-gray-50 border-b border-gray-100">
              <p className="text-[11px] font-semibold text-investep-navy leading-tight">
                {group.strategyLabel}
              </p>
              <p className="text-[10px] font-mono text-gray-500 truncate">
                {group.strategyId}
                {group.variantId ? ` · ${group.variantId}` : ""}
              </p>
            </div>
            {group.mandatoryRequirements.length > 0 && (
              <>
                <p className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-gray-500 bg-white border-b border-gray-100">
                  Obligatorios (100%)
                </p>
                <ul>
                  {group.mandatoryRequirements.map((c) => (
                    <RequirementRow
                      key={c.checkId}
                      c={c}
                      highlightCheckId={highlightCheckId}
                      onSelectCheck={onSelectCheck}
                    />
                  ))}
                </ul>
              </>
            )}
            {group.mandatoryRequirements.length > 0 && group.supportRequirements.length > 0 && (
              <div className="border-t border-dashed border-gray-300 bg-gray-50/80 px-2 py-1">
                <p className="text-[9px] font-bold uppercase tracking-wide text-amber-800">
                  Confirmaciones extra (+5% c/u)
                </p>
              </div>
            )}
            {group.supportRequirements.length > 0 && (
              <ul>
                {group.supportRequirements.map((c) => (
                  <RequirementRow
                    key={c.checkId}
                    c={c}
                    highlightCheckId={highlightCheckId}
                    onSelectCheck={onSelectCheck}
                    badge="+5%"
                  />
                ))}
              </ul>
            )}
          </div>
        ))}
        {filteredGroups.length === 0 && (
          <p className="text-[11px] text-gray-500 px-1 py-2">Sin coincidencias.</p>
        )}
      </div>
    </div>
  );
}

export function TestingCriteriasWorkspace({
  tickers,
  catalog: initialCatalog,
  financeAiConfigured,
  initialDeepLink,
}: Props) {
  const [catalog, setCatalog] = useState(initialCatalog);
  const [refreshingCatalog, setRefreshingCatalog] = useState(false);

  useEffect(() => {
    setCatalog(initialCatalog);
  }, [initialCatalog]);

  const [timeframeFilter, setTimeframeFilter] = useState<TestingTimeframe>("all");
  const [selectedCheckId, setSelectedCheckId] = useState("");
  const [selectedSymbols, setSelectedSymbols] = useState<Set<string>>(() => new Set());
  const [tickerFilter, setTickerFilter] = useState("");
  const [srFilter, setSrFilter] = useState("");
  const [showSrPayload, setShowSrPayload] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<TestingCriteriaSymbolResult[]>([]);
  const [lastRunMode, setLastRunMode] = useState<"saved" | "fresh" | null>(null);
  const [evalMode, setEvalMode] = useState<"now" | "at">("now");
  const [tradeDate, setTradeDate] = useState(() => tradingDateEt());
  const [timeEt, setTimeEt] = useState("10:15");

  useEffect(() => {
    if (!initialDeepLink) return;
    const knownSymbols = new Set(tickers.map((t) => t.symbol.toUpperCase()));
    if (initialDeepLink.symbols?.length) {
      const picked = initialDeepLink.symbols.filter((s) => knownSymbols.has(s));
      if (picked.length > 0) setSelectedSymbols(new Set(picked));
    }
    if (initialDeepLink.timeframe && initialDeepLink.timeframe !== "all") {
      setTimeframeFilter(initialDeepLink.timeframe as TestingTimeframe);
    }
    if (initialDeepLink.strategyId) {
      setSrFilter(initialDeepLink.strategyId);
    }
    const check =
      (initialDeepLink.checkId
        ? findCheckById(initialCatalog.checks, initialDeepLink.checkId)
        : undefined) ??
      (initialDeepLink.ruleKey
        ? findCheckByRule(initialCatalog.checks, {
            ruleKey: initialDeepLink.ruleKey,
            strategyId: initialDeepLink.strategyId,
            variantId: initialDeepLink.variantId,
            timeframe: initialDeepLink.timeframe,
          })
        : undefined);
    if (check) {
      setSelectedCheckId(check.checkId);
      if (check.timeframe) {
        setTimeframeFilter(check.timeframe as TestingTimeframe);
      }
    }
  }, [initialDeepLink, initialCatalog.checks, tickers]);

  const selectedCheck = useMemo(
    () => catalog.checks.find((c) => c.checkId === selectedCheckId),
    [catalog.checks, selectedCheckId]
  );

  const srGroups = useMemo(() => {
    const base = groupStrategyRequirements(catalog.checks, catalog.strategies);
    if (timeframeFilter === "all") return base;
    return base
      .map((g) => ({
        ...g,
        requirements: filterChecksByTimeframe(g.requirements, timeframeFilter),
      }))
      .filter((g) => g.requirements.length > 0);
  }, [catalog.checks, catalog.strategies, timeframeFilter]);

  const canRunTest =
    selectedSymbols.size > 0 && !!selectedCheck && financeAiConfigured;

  const visibleTickers = useMemo(() => {
    const q = tickerFilter.trim().toUpperCase();
    const list = q
      ? tickers.filter(
          (t) => t.symbol.includes(q) || (t.name ?? "").toUpperCase().includes(q)
        )
      : tickers;
    return list.sort((a, b) => a.symbol.localeCompare(b.symbol));
  }, [tickers, tickerFilter]);

  const testOutcomes = useMemo(
    () =>
      results.map((r) =>
        resolveTestingTickerOutcome(r, { selectedCheck: selectedCheck ?? undefined })
      ),
    [results, selectedCheck]
  );

  const outcomeSummary = useMemo(() => summarizeTestingOutcomes(testOutcomes), [testOutcomes]);

  const toggleSymbol = useCallback((sym: string) => {
    setSelectedSymbols((prev) => {
      const next = new Set(prev);
      if (next.has(sym)) next.delete(sym);
      else next.add(sym);
      return next;
    });
  }, []);

  const selectCheck = useCallback((check: TestingCriteriaCheck) => {
    setSelectedCheckId(check.checkId);
    setResults([]);
    setError(null);
  }, []);

  const refreshCatalog = useCallback(async () => {
    setRefreshingCatalog(true);
    setError(null);
    const response = await loadTestingCriteriasCatalog();
    setRefreshingCatalog(false);
    if (!response.success || !response.catalog) {
      setError(response.error ?? "No se pudo actualizar el catálogo de SR");
      return;
    }
    setCatalog(response.catalog);
    setSelectedCheckId((prev) =>
      response.catalog!.checks.some((c) => c.checkId === prev) ? prev : ""
    );
    setResults([]);
  }, []);

  const runTest = useCallback(
    async (fresh: boolean) => {
      const symbols = [...selectedSymbols];
      if (symbols.length === 0) {
        setError("Selecciona al menos un ticker.");
        return;
      }
      if (!selectedCheck) {
        setError("Selecciona un strategy requirement de la lista.");
        return;
      }
      setLoading(true);
      setError(null);
      setLastRunMode(fresh ? "fresh" : "saved");
      const response = await runTestingCriteriaBatch({
        symbols,
        fresh,
        selectedCheckId: selectedCheck.checkId,
        checks: catalog.checks,
        ...(evalMode === "at"
          ? {
              tradeDate: tradeDate.trim() || tradingDateEt(),
              simulationTimeEt: timeEt.trim() || undefined,
            }
          : {}),
      });
      setLoading(false);
      if (!response.success && response.results.length === 0) {
        setError(response.error ?? "Error al ejecutar prueba");
        return;
      }
      setResults(response.results);
      if (response.error) setError(response.error);
    },
    [selectedSymbols, selectedCheck, catalog.checks, evalMode, tradeDate, timeEt]
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] lg:items-start">
        <aside className="rounded-lg border border-gray-200 bg-white p-3 space-y-3 lg:sticky lg:top-4 lg:max-h-[calc(100vh-6rem)] lg:flex lg:flex-col lg:min-h-0">
          <div className="shrink-0">
            <h2 className="text-sm font-semibold text-investep-navy">Tickers</h2>
            <p className="text-[10px] text-gray-500 mt-0.5">
              {selectedSymbols.size} seleccionados ·{" "}
              <Link href="/config/tickers" className="underline">
                Config
              </Link>
            </p>
          </div>
          <input
            type="text"
            value={tickerFilter}
            onChange={(e) => setTickerFilter(e.target.value.toUpperCase())}
            placeholder="Filtrar…"
            className="w-full shrink-0 text-xs border border-gray-300 rounded px-2 py-1 font-mono uppercase"
          />
          <div className="flex gap-1 shrink-0">
            <button
              type="button"
              className="text-[10px] px-2 py-0.5 rounded border border-gray-300 bg-gray-50"
              onClick={() => setSelectedSymbols(new Set(visibleTickers.map((t) => t.symbol)))}
            >
              Todos visibles
            </button>
            <button
              type="button"
              className="text-[10px] px-2 py-0.5 rounded border border-gray-300 bg-gray-50"
              onClick={() => setSelectedSymbols(new Set())}
            >
              Limpiar
            </button>
          </div>
          <ul className="min-h-0 flex-1 overflow-y-auto space-y-0.5 border border-gray-100 rounded p-1 max-h-80 lg:max-h-none">
            {visibleTickers.map((t) => (
              <li key={t.symbol}>
                <label className="flex items-center gap-2 text-xs cursor-pointer py-0.5 px-1 rounded hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={selectedSymbols.has(t.symbol)}
                    onChange={() => toggleSymbol(t.symbol)}
                    className="rounded border-gray-300"
                  />
                  <span className="font-mono font-medium">{t.symbol}</span>
                  {t.name && <span className="text-gray-500 truncate text-[10px]">{t.name}</span>}
                </label>
              </li>
            ))}
          </ul>
        </aside>

        <div className="grid gap-4 min-w-0 xl:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] xl:items-start">
          <aside className="rounded-lg border border-gray-200 bg-white p-3 space-y-2 h-fit xl:sticky xl:top-4 xl:max-h-[calc(100vh-6rem)] xl:flex xl:flex-col xl:min-h-0">
            <div className="flex flex-wrap items-end gap-2 justify-between shrink-0">
              <div>
                <h2 className="text-sm font-semibold text-investep-navy">Strategy requirements</h2>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  SR aislados · <code className="text-[9px]">POST /rules/check</code>
                </p>
              </div>
              <label className="text-[10px] text-gray-600">
                <span className="sr-only">Temporalidad</span>
                <select
                  value={timeframeFilter}
                  onChange={(e) => {
                    setTimeframeFilter(e.target.value as TestingTimeframe);
                    setSelectedCheckId("");
                    setResults([]);
                  }}
                  className="text-xs border border-gray-300 rounded px-1.5 py-0.5 bg-white"
                >
                  {TIMEFRAME_FILTER_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">
              <StrategyRequirementsList
                groups={srGroups}
                highlightCheckId={selectedCheckId}
                srFilter={srFilter}
                onSrFilterChange={setSrFilter}
                onSelectCheck={selectCheck}
                catalogMeta={{
                  source: catalog.source,
                  sourceFiles: catalog.sourceFiles,
                  loadedAt: catalog.loadedAt,
                }}
                onRefreshCatalog={() => void refreshCatalog()}
                refreshingCatalog={refreshingCatalog}
              />
            </div>
          </aside>

          <div className="space-y-4 min-w-0">
          <section className="rounded-lg border border-violet-200 bg-violet-50/40 p-4 space-y-3">
            <h2 className="text-sm font-semibold text-investep-navy">Probar SR aislado</h2>
            <p className="text-[10px] text-gray-600">
              Selecciona tickers + un requirement de la lista. Cada corrida evalúa{" "}
              <strong>solo ese criterio</strong> vía <code className="text-[9px]">POST /rules/check</code>.
            </p>

            <div className="rounded-lg border border-gray-200 bg-white/80 px-3 py-2.5 space-y-2">
              <p className="text-xs font-medium text-investep-navy">Momento de evaluacion</p>
              <div className="flex flex-wrap gap-3 text-xs">
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="testing-criterias-eval-mode"
                    checked={evalMode === "now"}
                    disabled={loading}
                    onChange={() => setEvalMode("now")}
                  />
                  Now
                </label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="testing-criterias-eval-mode"
                    checked={evalMode === "at"}
                    disabled={loading}
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
                      disabled={loading}
                      onChange={(e) => setTradeDate(e.target.value)}
                      className="block mt-0.5 border border-gray-300 rounded px-2 py-1 text-sm"
                    />
                  </label>
                  <label className="text-xs text-gray-600">
                    Hora (ET)
                    <input
                      type="time"
                      value={timeEt}
                      disabled={loading}
                      step={60}
                      onChange={(e) => setTimeEt(e.target.value)}
                      className="block mt-0.5 border border-gray-300 rounded px-2 py-1 text-sm"
                    />
                  </label>
                </div>
              )}
            </div>

            {selectedCheck?.strategyId === BB15_STRATEGY_ID && (
              <p className="text-[10px] text-amber-900 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
                BB15: evalúa checks de apertura 9:30–9:40 (no recálculo completo). Preferí{" "}
                <strong>Test from Saved</strong> con ticker context listo;{" "}
                <strong>Test on Fresh</strong> refresca 15M en AWS y puede tardar más.
              </p>
            )}

            {selectedCheck ? (
              <div className="rounded border border-violet-200 bg-white/80 px-2 py-1.5 space-y-1">
                <p className="text-[11px] text-violet-950 font-medium">{selectedCheck.label}</p>
                <p className="text-[10px] font-mono text-gray-500">
                  {selectedCheck.ruleKey} · {timeframeLabel(selectedCheck.timeframe)} ·{" "}
                  {selectedCheck.strategyId}
                  {selectedCheck.variantId ? ` / ${selectedCheck.variantId}` : ""}
                </p>
                <button
                  type="button"
                  onClick={() => setShowSrPayload((v) => !v)}
                  className="text-[10px] text-violet-700 underline"
                >
                  {showSrPayload ? "Ocultar payload API" : "Ver payload API"}
                </button>
                {showSrPayload && (
                  <pre className="text-[9px] font-mono bg-gray-50 border border-gray-100 rounded p-1.5 overflow-x-auto text-gray-700">
                    {JSON.stringify(
                      {
                        symbols: ["TICKER1", "TICKER2"],
                        fresh: false,
                        ...(evalMode === "at"
                          ? {
                              tradeDate: tradeDate || "2026-06-19",
                              simulationTimeEt: timeEt || "10:15",
                            }
                          : {}),
                        rule: rulesApiPayload(selectedCheck),
                      },
                      null,
                      2
                    )}
                  </pre>
                )}
              </div>
            ) : (
              <p className="text-[11px] text-amber-800">Selecciona un requirement de la lista.</p>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={loading || !canRunTest}
                onClick={() => void runTest(false)}
                className="text-xs px-3 py-1.5 rounded bg-investep-navy text-white font-medium disabled:opacity-50"
              >
                {loading && lastRunMode === "saved" ? "Probando…" : "Test from Saved"}
              </button>
              <button
                type="button"
                disabled={loading || !canRunTest}
                onClick={() => void runTest(true)}
                className="text-xs px-3 py-1.5 rounded bg-violet-700 text-white font-medium disabled:opacity-50"
              >
                {loading && lastRunMode === "fresh" ? "Probando…" : "Test on Fresh"}
              </button>
            </div>
            {!financeAiConfigured && (
              <p className="text-[10px] text-amber-800">FinanceAI no configurado</p>
            )}
          </section>

          {(error || testOutcomes.length > 0) && (
            <section className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
              <div className="flex flex-wrap items-baseline gap-3 justify-between">
                <h2 className="text-sm font-semibold text-investep-navy">
                  Resultados
                  {selectedCheck && (
                    <span className="font-normal text-gray-600 text-xs ml-2">
                      · {selectedCheck.ruleKey}
                    </span>
                  )}
                </h2>
                {testOutcomes.length > 0 && (
                  <p className="text-[11px] text-gray-600 tabular-nums">
                    <span className="text-green-700 font-semibold">{outcomeSummary.pass} pass</span>
                    {" · "}
                    <span className="text-orange-800 font-semibold">{outcomeSummary.fail} fail</span>
                    {outcomeSummary.error > 0 && (
                      <>
                        {" · "}
                        <span className="text-red-700 font-semibold">{outcomeSummary.error} error</span>
                      </>
                    )}
                    {lastRunMode && (
                      <span className="text-gray-400 ml-1">
                        ({lastRunMode === "fresh" ? "Fresh" : "Saved"})
                      </span>
                    )}
                  </p>
                )}
              </div>
              {error && (
                <p className="text-xs text-red-700">
                  {error.includes("timed out")
                    ? `${error} — API Gateway ~29s. Probá Test from Saved, menos tickers, o desplegá el fix SR BB15 en FinanceAI.`
                    : error}
                </p>
              )}
              <div className="space-y-2">
                {testOutcomes.map((outcome) => (
                  <TestResultCard key={outcome.symbol} outcome={outcome} />
                ))}
              </div>
            </section>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}
