import { formatBb15TimeHm24 } from "@/lib/bb15-fast-display";
import type {
  FinanceAiPremarketAnalysis,
  FinanceAiStrategyCheckItem,
  FinanceAiStrategyFit,
} from "@/lib/finance-ai-types";
import { panoramaFromAnalysis, resolveReferencePrice } from "@/lib/result-now-brief";
import type { CollapsedProgressBadge, CollapsedRuleIconItem, DecisionTimingView } from "@/lib/movement-ticker-badge-types";
import {
  strategyChecklistProgress,
  strategyEntryDirection,
  strategyProbabilityPct,
  strategyRulesForDisplay,
  type StrategyRuleDisplay,
} from "@/lib/strategy-display";
import { strategyChecksFromRuleKeys } from "@/lib/ticker-strategy-checks-map";

export const E03_STRATEGY_ID = "estrategia-03";

/** E03 mandatory SR (100% checklist) — from estrategia-03 playbooks. */
export const E03_MANDATORY_RULE_KEYS = [
  "ma_separation_1h",
  "gap_open",
  "bb_exposure",
  "volume_stoch_hour",
] as const;

export type E03MandatoryRuleKey = (typeof E03_MANDATORY_RULE_KEYS)[number];

export type E03OutsideTickerRow = {
  symbol: string;
  success: boolean;
  error?: string;
  strategy?: FinanceAiStrategyFit;
  analysis?: FinanceAiPremarketAnalysis;
  mandatoryMet: number;
  mandatoryTotal: number;
  bbExposure?: FinanceAiStrategyCheckItem;
  rules: StrategyRuleDisplay[];
};

export function resolveE03Direction(strategy: FinanceAiStrategyFit): "CALL" | "PUT" | null {
  return strategyEntryDirection(strategy);
}

export function resolveE03DirectionLabel(strategy: FinanceAiStrategyFit): string {
  const dir = resolveE03Direction(strategy);
  return dir ?? "—";
}

export function isE03MandatoryItem(item: FinanceAiStrategyCheckItem): boolean {
  if (item.classification === "support" || item.classification === "execution") return false;
  if (item.supportBonusPct != null && item.supportBonusPct > 0) return false;
  const rk = item.ruleKey ?? "";
  if (E03_MANDATORY_RULE_KEYS.includes(rk as E03MandatoryRuleKey)) return true;
  if (item.classification === "mandatory") return true;
  return false;
}

export function countE03MandatoryMet(strategy: FinanceAiStrategyFit): {
  met: number;
  total: number;
} {
  const mandatory = (strategy.checklist ?? []).filter(isE03MandatoryItem);
  const total = mandatory.length > 0 ? mandatory.length : E03_MANDATORY_RULE_KEYS.length;
  const met = mandatory.filter((i) => i.status === "met").length;
  return { met, total };
}

export function isE03StrategyFullyMet(strategy: FinanceAiStrategyFit): boolean {
  const { met, total } = countE03MandatoryMet(strategy);
  return total > 0 && met >= total;
}

/** Show in Outside results when ≥2 mandatory E03 checks met (incl. bb_exposure path). */
export function e03OutsideTickerVisible(row: E03OutsideTickerRow): boolean {
  if (!row.success || !row.strategy) return false;
  if (isE03StrategyFullyMet(row.strategy)) return true;
  return row.mandatoryMet >= 2;
}

export function pickBestE03Strategy(
  strategies: FinanceAiStrategyFit[] | undefined
): FinanceAiStrategyFit | undefined {
  if (!strategies?.length) return undefined;
  const e03 = strategies.filter((s) => s.strategyId === E03_STRATEGY_ID);
  if (e03.length === 0) return undefined;
  return [...e03].sort((a, b) => {
    const pa = strategyChecklistProgress(a).weightedPct;
    const pb = strategyChecklistProgress(b).weightedPct;
    if (pa !== pb) return pb - pa;
    return countE03MandatoryMet(b).met - countE03MandatoryMet(a).met;
  })[0];
}

export function buildE03OutsideTickerRow(
  symbol: string,
  analysis: FinanceAiPremarketAnalysis | undefined,
  error?: string
): E03OutsideTickerRow {
  if (!analysis?.strategyChecklist?.strategies) {
    return {
      symbol,
      success: false,
      error: error ?? analysis?.error ?? analysis?.message ?? "Sin checklist E03",
      mandatoryMet: 0,
      mandatoryTotal: E03_MANDATORY_RULE_KEYS.length,
      rules: [],
    };
  }
  const strategy = pickBestE03Strategy(analysis.strategyChecklist.strategies);
  if (!strategy) {
    return {
      symbol,
      success: false,
      error: "E03 no presente en checklist",
      analysis,
      mandatoryMet: 0,
      mandatoryTotal: E03_MANDATORY_RULE_KEYS.length,
      rules: [],
    };
  }
  const { met, total } = countE03MandatoryMet(strategy);
  const bbExposure = (strategy.checklist ?? []).find((i) => i.ruleKey === "bb_exposure");
  return {
    symbol,
    success: true,
    strategy,
    analysis,
    mandatoryMet: met,
    mandatoryTotal: total,
    bbExposure,
    rules: strategyRulesForDisplay(strategy),
  };
}

export function partitionE03OutsideRows(rows: E03OutsideTickerRow[]): {
  met: E03OutsideTickerRow[];
  notMet: E03OutsideTickerRow[];
} {
  const byProb = (a: E03OutsideTickerRow, b: E03OutsideTickerRow) => {
    const pa = a.strategy ? strategyChecklistProgress(a.strategy).weightedPct : 0;
    const pb = b.strategy ? strategyChecklistProgress(b.strategy).weightedPct : 0;
    if (pa !== pb) return pb - pa;
    return b.mandatoryMet - a.mandatoryMet;
  };
  const visible = rows.filter(e03OutsideTickerVisible);
  return {
    met: visible.filter((r) => r.strategy && isE03StrategyFullyMet(r.strategy)).sort(byProb),
    notMet: visible.filter((r) => !r.strategy || !isE03StrategyFullyMet(r.strategy)).sort(byProb),
  };
}

export function resolveE03ReferencePrice(row: E03OutsideTickerRow): number | undefined {
  const analysis = row.analysis;
  if (!analysis) return undefined;
  const premarketLast = analysis.sessionGap?.premarketToday?.premarketLast;
  if (premarketLast != null && !Number.isNaN(Number(premarketLast))) {
    return Number(premarketLast);
  }
  return resolveReferencePrice(panoramaFromAnalysis(analysis));
}

export function resolveE03MandatoryRuleIcons(strategy: FinanceAiStrategyFit): CollapsedRuleIconItem[] {
  return strategyChecksFromRuleKeys(strategy.checklist, E03_MANDATORY_RULE_KEYS).map((check) => ({
    id: check.id,
    label: check.label,
    met: check.status === "met" ? true : undefined,
    probable: check.status === "partial" ? true : undefined,
    pending: check.status === "pending" ? true : undefined,
    aboutToCross: check.status === "about_to_cross" ? true : undefined,
    ...(check.status === "not_met" ? { met: false } : {}),
  }));
}

export function resolveE03MandatoryStrategyChecks(strategy: FinanceAiStrategyFit) {
  return strategyChecksFromRuleKeys(strategy.checklist, E03_MANDATORY_RULE_KEYS);
}

export function resolveE03DecisionTiming(row: E03OutsideTickerRow): DecisionTimingView {
  const strategy = row.strategy;
  if (!strategy) {
    return {
      label: "PEND",
      className: "text-gray-500 bg-gray-50 border-gray-200",
      title: "Sin evaluación E03",
    };
  }
  if (strategy.openingWindowExpired || strategy.openingWindowMissed) {
    return {
      label: "LATE",
      className: "text-red-700 bg-red-50 border-red-200",
      title: strategy.expiredReason ?? "Ventana E03 cerrada",
    };
  }
  if (isE03StrategyFullyMet(strategy)) {
    return {
      label: "GOOD",
      className: "text-green-700 bg-green-50 border-green-200",
      title: "E03 obligatorios cumplidos",
    };
  }
  if (row.mandatoryMet >= 3) {
    return {
      label: "PROBABLE",
      className: "text-amber-700 bg-amber-50 border-amber-200",
      title: `${row.mandatoryMet}/${row.mandatoryTotal} obligatorios E03`,
    };
  }
  return {
    label: "PEND",
    className: "text-gray-500 bg-gray-50 border-gray-200",
    title: `${row.mandatoryMet}/${row.mandatoryTotal} obligatorios E03`,
  };
}

export function resolveE03CollapsedTickerBadge(row: E03OutsideTickerRow): CollapsedProgressBadge | null {
  if (!row.success || !row.strategy) return null;
  const pct = strategyProbabilityPct(row.strategy);
  const time =
    formatBb15TimeHm24(row.analysis?.nowUpdatedAt ?? row.analysis?.updatedAt) ?? "E03";
  const pctText = `${pct}%`;
  return {
    pct,
    premarketLabel: time,
    lastCheckLabel: null,
    progressLine: `${pctText} - ${time}`,
  };
}
