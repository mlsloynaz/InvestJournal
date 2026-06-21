import type { FinanceAiStrategyCheckItem } from "@/lib/finance-ai-types";
import { timeframeLabel, proposedExecutionFromCheck, type TestingCriteriaCheck } from "@/lib/testing-criterias-registry";
import type { TestingCriteriaSymbolResult } from "@/server/actions/testing-criterias";

export type TestingResultStatus = "pass" | "fail" | "error";

export type TestingRuleOutcome = {
  label: string;
  timeframe?: string;
  ruleKey?: string;
  passed: boolean;
  pending?: boolean;
  reason?: string;
};

export type TestingTickerOutcome = {
  symbol: string;
  status: TestingResultStatus;
  passed: boolean;
  headline: string;
  failSummary?: string;
  scoreLabel?: string;
  priceContext: string[];
  ruleOutcomes: TestingRuleOutcome[];
  contextSource?: string;
  error?: string;
  /** E01: CALL/PUT broker proposal when trend SR passes (not a separate isolated test). */
  executionProposal?: string;
};

function checklistItemToRuleOutcome(item: FinanceAiStrategyCheckItem): TestingRuleOutcome {
  const passed = item.status === "met";
  const pending = item.status === "unknown" || item.status === "manual";
  return {
    label: item.label ?? item.ruleKey ?? "Check",
    timeframe: item.timeframe,
    ruleKey: item.ruleKey,
    passed,
    pending,
    reason:
      item.evidence ??
      (item.status === "partial" ? "Parcial — confirmar en sesión" : undefined),
  };
}

function singleCheckScoreLabel(selected: TestingCriteriaCheck): string {
  return `[${timeframeLabel(selected.timeframe)}] ${selected.label}`;
}

/** Map one SR API row → UI outcome (isolated requirement only). */
export function resolveTestingTickerOutcome(
  result: TestingCriteriaSymbolResult,
  options?: { selectedCheck?: TestingCriteriaCheck }
): TestingTickerOutcome {
  const selected = options?.selectedCheck;

  if (!result.success) {
    return {
      symbol: result.symbol,
      status: "error",
      passed: false,
      headline: "ERROR",
      error: result.error ?? "Evaluación falló",
      priceContext: [],
      ruleOutcomes: [],
      contextSource: result.contextSource,
    };
  }

  const item =
    result.srResult?.check ??
    result.playbookStrategy?.checklist?.[0];

  if (!item) {
    return {
      symbol: result.symbol,
      status: "fail",
      passed: false,
      headline: "FAIL",
      failSummary: result.error ?? "Sin check en la respuesta SR.",
      scoreLabel: selected ? singleCheckScoreLabel(selected) : undefined,
      priceContext: [],
      ruleOutcomes: [],
      contextSource: result.contextSource,
    };
  }

  const rule = checklistItemToRuleOutcome(item);
  const passed = result.srResult?.passed ?? rule.passed;
  const status: TestingResultStatus = passed
    ? "pass"
    : rule.pending
      ? "fail"
      : item.status === "unknown"
        ? "fail"
        : "fail";

  return {
    symbol: result.symbol,
    status: passed ? "pass" : status,
    passed,
    headline: passed ? "PASS" : "FAIL",
    failSummary: passed
      ? undefined
      : rule.reason ?? result.error ?? `${rule.label} — ${item.status ?? "not_met"}`,
    scoreLabel: selected ? singleCheckScoreLabel(selected) : rule.ruleKey,
    priceContext: [],
    ruleOutcomes: [rule],
    contextSource: result.contextSource,
    executionProposal: passed ? proposedExecutionFromCheck(selected) ?? undefined : undefined,
  };
}

export function summarizeTestingOutcomes(outcomes: TestingTickerOutcome[]): {
  pass: number;
  fail: number;
  error: number;
} {
  let pass = 0;
  let fail = 0;
  let error = 0;
  for (const o of outcomes) {
    if (o.status === "pass") pass += 1;
    else if (o.status === "error") error += 1;
    else fail += 1;
  }
  return { pass, fail, error };
}
