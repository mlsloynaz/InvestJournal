"use server";

import type { FinanceAiStrategyCheckItem, FinanceAiStrategyFit } from "@/lib/finance-ai-types";
import { buildPlaybooksFromDocs } from "@/lib/estrategia-playbook-parser";
import {
  buildTestingCatalogFromPlaybooks,
  findCheckById,
  type TestingCriteriaCheck,
  type TestingStrategyOption,
} from "@/lib/testing-criterias-registry";
import { buildEstrategiaStrategiesMarkdown } from "@/server/services/estrategia-strategies-export";
import {
  checkRules,
  isFinanceAiConfigured,
} from "@/server/services/finance-ai-client";

export type TestingCriteriaCatalog = {
  strategies: TestingStrategyOption[];
  checks: TestingCriteriaCheck[];
  source: string;
  sourceFiles: string[];
  loadedAt: string;
};

export type TestingCriteriaSymbolResult = {
  symbol: string;
  success: boolean;
  error?: string;
  contextSource?: string;
  playbookStrategy?: FinanceAiStrategyFit;
  srResult?: {
    passed?: boolean;
    status?: string;
    check?: FinanceAiStrategyCheckItem;
    requirement?: Record<string, unknown>;
  };
};

function testingCheckToRule(check: TestingCriteriaCheck) {
  return {
    ruleKey: check.ruleKey,
    timeframe: check.timeframe,
    label: check.label,
    strategyId: check.strategyId,
    variantId: check.variantId,
    requirementId: check.requirementId,
    automatable: check.automatable,
    ...(check.classification ? { classification: check.classification } : {}),
    ...(check.supportBonusPct != null ? { supportBonusPct: check.supportBonusPct } : {}),
    ...(check.strategyId === "estrategia-03" && check.ruleKey === "volume_stoch_hour"
      ? { targetHourEt: 9 }
      : {}),
  };
}

function srRowToSymbolResult(
  row: {
    symbol: string;
    success: boolean;
    passed?: boolean;
    status?: string;
    error?: string;
    check?: FinanceAiStrategyCheckItem;
    contextSource?: string;
    requirement?: Record<string, unknown>;
  },
  fresh: boolean
): TestingCriteriaSymbolResult {
  const playbookStrategy: FinanceAiStrategyFit | undefined = row.check
    ? {
        strategyId: row.requirement?.strategyId as string | undefined,
        variantId: row.requirement?.variantId as string | undefined,
        checklist: [row.check],
      }
    : undefined;

  return {
    symbol: row.symbol,
    success: row.success,
    error: row.error,
    contextSource: row.contextSource ?? (fresh ? "fresh" : "saved"),
    playbookStrategy,
    srResult: {
      passed: row.passed,
      status: row.status,
      check: row.check,
      requirement: row.requirement,
    },
  };
}

export async function loadTestingCriteriasCatalog(): Promise<{
  success: boolean;
  catalog?: TestingCriteriaCatalog;
  error?: string;
}> {
  try {
    const { sourceFiles, docs } = await buildEstrategiaStrategiesMarkdown();
    const playbooks = await buildPlaybooksFromDocs(docs);
    const built = buildTestingCatalogFromPlaybooks(playbooks);
    return {
      success: true,
      catalog: {
        ...built,
        source: "estrategia-*.md",
        sourceFiles,
        loadedAt: new Date().toISOString(),
      },
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "No se pudo cargar el catálogo de criterios",
    };
  }
}

/** Isolated rule test — POST /rules/check (one rule, many tickers). */
export async function runTestingCriteriaBatch(params: {
  symbols: string[];
  fresh: boolean;
  selectedCheckId: string;
  checks: TestingCriteriaCheck[];
  tradeDate?: string;
  simulationTimeEt?: string;
}): Promise<{
  success: boolean;
  results: TestingCriteriaSymbolResult[];
  error?: string;
}> {
  if (!isFinanceAiConfigured()) {
    return { success: false, results: [], error: "FinanceAI no configurado" };
  }

  const symbols = [...new Set(params.symbols.map((s) => s.trim().toUpperCase()).filter(Boolean))];
  if (symbols.length === 0) {
    return { success: false, results: [], error: "Selecciona al menos un ticker." };
  }

  const selectedCheck = findCheckById(params.checks, params.selectedCheckId);
  if (!selectedCheck) {
    return { success: false, results: [], error: "Selecciona una regla (SR)." };
  }

  const api = await checkRules({
    symbols,
    rule: testingCheckToRule(selectedCheck),
    fresh: params.fresh,
    tradeDate: params.tradeDate,
    simulationTimeEt: params.simulationTimeEt,
  });

  if (!api.ok) {
    return { success: false, results: [], error: api.error };
  }

  const results = (api.data.results ?? []).map((row) => srRowToSymbolResult(row, params.fresh));
  return {
    success: true,
    results,
    error: api.data.errors?.join(" · "),
  };
}
