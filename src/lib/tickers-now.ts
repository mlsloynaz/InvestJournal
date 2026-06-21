import type {
  FinanceAiPremarketAnalysis,
  FinanceAiStrategyCheckItem,
  FinanceAiStrategyFit,
  FinanceAiTickersNow,
  FinanceAiTickersNowEntry,
} from "@/lib/finance-ai-types";
import { strategyProbabilityPct } from "@/lib/strategy-display";

const MIN_PASS_PCT = 50;
export const TICKERS_NOW_MAX_SYMBOLS = 10;

function isMandatoryScorable(item: FinanceAiStrategyCheckItem): boolean {
  if (item.automatable === "false") return false;
  const rk = String(item.ruleKey ?? "");
  if (rk === "options_execution") return false;
  const classification = String(item.classification ?? "mandatory").toLowerCase();
  return classification !== "support";
}

function statusWeight(status: string | undefined): number {
  switch (status) {
    case "met":
      return 1;
    case "partial":
      return 0.5;
    case "unknown":
      return 0.25;
    default:
      return 0;
  }
}

export function strategyMandatoryPassPct(strategy: FinanceAiStrategyFit): number {
  const basis = strategy.probabilityBasis?.mandatoryPct;
  if (typeof basis === "number" && !Number.isNaN(basis)) {
    return basis;
  }
  const mandatory = (strategy.checklist ?? []).filter(isMandatoryScorable);
  if (mandatory.length === 0) return 0;
  const total = mandatory.reduce((sum, item) => sum + statusWeight(item.status), 0);
  return Math.round((total / mandatory.length) * 1000) / 10;
}

export function strategyMeetsTickersNowThreshold(strategy: FinanceAiStrategyFit): boolean {
  return strategyMandatoryPassPct(strategy) >= MIN_PASS_PCT;
}

function checklistForTickersNow(
  analysis: FinanceAiPremarketAnalysis | null | undefined
): FinanceAiPremarketAnalysis["strategyChecklist"] | undefined {
  const baseline = analysis?.preBaseline;
  if (baseline?.mode === "full" && baseline.strategyChecklist?.ready) {
    return baseline.strategyChecklist;
  }
  if (analysis?.strategyChecklist?.ready && analysis.mode === "full") {
    return analysis.strategyChecklist;
  }
  if (baseline?.strategyChecklist?.ready) {
    return baseline.strategyChecklist;
  }
  return analysis?.strategyChecklist;
}

export function qualifyingStrategiesFromAnalysis(
  analysis: FinanceAiPremarketAnalysis | null | undefined
): Array<FinanceAiStrategyFit & { passPct: number }> {
  const strategies = checklistForTickersNow(analysis)?.strategies ?? [];
  return strategies
    .map((s) => ({ ...s, passPct: strategyMandatoryPassPct(s) }))
    .filter((s) => s.passPct >= MIN_PASS_PCT)
    .sort((a, b) => b.passPct - a.passPct);
}

export function tickerQualifiesForTickersNow(
  analysis: FinanceAiPremarketAnalysis | null | undefined
): boolean {
  return qualifyingStrategiesFromAnalysis(analysis).length > 0;
}

export function buildTickersNowPreviewFromAnalyses(
  analyses: Record<string, FinanceAiPremarketAnalysis | null | undefined>,
  tradeDate: string
): FinanceAiTickersNow {
  const entries: FinanceAiTickersNowEntry[] = [];
  for (const [symbol, analysis] of Object.entries(analyses)) {
    if (!analysis || analysis.date !== tradeDate) continue;
    const qualified = qualifyingStrategiesFromAnalysis(analysis).sort(
      (a, b) => strategyProbabilityPct(b) - strategyProbabilityPct(a)
    );
    if (qualified.length === 0) continue;
    const best = qualified[0];
    entries.push({
      symbol,
      bestPassPct: best.passPct,
      bestProbabilityPct: strategyProbabilityPct(best),
      bestStrategyId: best.strategyId,
      bestDirection: best.direction,
      strategies: qualified.map((s) => ({
        strategyId: s.strategyId,
        variantId: s.variantId,
        variantName: s.variantName,
        direction: s.direction,
        fit: s.fit,
        passPct: s.passPct,
        probabilityPct: strategyProbabilityPct(s),
      })),
    });
  }
  entries.sort(
    (a, b) =>
      (b.bestProbabilityPct ?? 0) - (a.bestProbabilityPct ?? 0) ||
      (b.bestPassPct ?? 0) - (a.bestPassPct ?? 0)
  );
  const capped =
    TICKERS_NOW_MAX_SYMBOLS > 0 ? entries.slice(0, TICKERS_NOW_MAX_SYMBOLS) : entries;
  const symbols = capped.map((e) => e.symbol);
  return {
    tradeDate,
    symbols,
    entries: capped,
    minPassPct: MIN_PASS_PCT,
    maxSymbols: TICKERS_NOW_MAX_SYMBOLS,
    criteria: "mandatory_pass_50_top10_prob",
  };
}

export function resolveTickersNowSymbols(
  tickersNow: FinanceAiTickersNow | null | undefined,
  tradeDate: string
): string[] {
  if (!tickersNow || tickersNow.tradeDate !== tradeDate) return [];
  return Array.isArray(tickersNow.symbols) ? tickersNow.symbols : [];
}

/** Rows for NOW / POST panels — TickersToday only (not all ★ ready). */
export function gestionRowsForSessionAnalysis<
  T extends { symbol: string },
>(rows: T[], tickersNow: FinanceAiTickersNow | null | undefined, tradeDate: string): T[] {
  const scope = resolveTickersNowSymbols(tickersNow, tradeDate);
  if (scope.length === 0) return [];
  const bySymbol = new Map(rows.map((r) => [r.symbol, r]));
  return scope.map((sym) => bySymbol.get(sym)).filter((r): r is T => r != null);
}

export function sessionAnalysisSymbolsFromReady(
  readySymbols: string[],
  tickersNow: FinanceAiTickersNow | null | undefined,
  tradeDate: string
): string[] {
  const scope = new Set(resolveTickersNowSymbols(tickersNow, tradeDate));
  if (scope.size === 0) return [];
  return readySymbols.filter((s) => scope.has(s));
}
