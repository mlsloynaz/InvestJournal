import type {
  RequirementClassification,
  StrategyPlaybook,
  StrategyPlaybookRequirement,
} from "@/lib/estrategia-playbook-types";
import { STRATEGY_CANONICAL_NAMES } from "@/lib/strategy-display";

export type TestingTimeframe = "15m" | "1h" | "D" | "execution" | "all";

export type TestingCriteriaCheck = {
  checkId: string;
  ruleKey: string;
  label: string;
  timeframe: string;
  automatable: string;
  strategyId: string;
  strategyLabel: string;
  variantId?: string;
  variantName?: string;
  requirementId?: string;
  classification?: RequirementClassification;
  supportBonusPct?: number;
};

export type TestingStrategyOption = {
  optionId: string;
  strategyId: string;
  label: string;
  variantId?: string;
  variantName?: string;
  isBb15?: boolean;
  isNoStrategy?: boolean;
};

export const BB15_STRATEGY_ID = "bolinger-15-change-trend";

/** Not isolated SR tests — broker entry is proposed when trend reqs pass (E01 CALL/PUT). */
export const ISOLATED_SR_EXCLUDED_RULE_KEYS = new Set(["options_execution"]);

export function isIsolatedTestableRequirement(ruleKey: string): boolean {
  return !ISOLATED_SR_EXCLUDED_RULE_KEYS.has(ruleKey);
}

/** Run check ticker — all playbook checklists, no single-strategy filter. */
export const NO_STRATEGY_OPTION_ID = "none";

export const NO_STRATEGY_OPTION: TestingStrategyOption = {
  optionId: NO_STRATEGY_OPTION_ID,
  strategyId: NO_STRATEGY_OPTION_ID,
  label: "No Strategies",
  isNoStrategy: true,
};

export const BB15_CRITERIA_CHECKS: TestingCriteriaCheck[] = [
  {
    checkId: "bb15:vol_bb_expand_post_open",
    ruleKey: "vol_bb_expand_post_open",
    label: "Vol BB expandió post-apertura",
    timeframe: "15m",
    automatable: "true",
    strategyId: BB15_STRATEGY_ID,
    strategyLabel: "BB15 Cambio tendencia 15m",
    requirementId: "r1",
  },
  {
    checkId: "bb15:open_inside_bb15",
    ruleKey: "open_inside_bb15",
    label: "Open dentro BB 15m",
    timeframe: "15m",
    automatable: "true",
    strategyId: BB15_STRATEGY_ID,
    strategyLabel: "BB15 Cambio tendencia 15m",
    requirementId: "r2",
  },
  {
    checkId: "bb15:bb_mid_cut_15m",
    ruleKey: "bb_mid_cut_15m",
    label: "Corte punto medio BB",
    timeframe: "15m",
    automatable: "true",
    strategyId: BB15_STRATEGY_ID,
    strategyLabel: "BB15 Cambio tendencia 15m",
    requirementId: "r3",
  },
  {
    checkId: "bb15:trend_cut_counter",
    ruleKey: "trend_cut_counter",
    label: "Corte de Tendencia",
    timeframe: "15m",
    automatable: "true",
    strategyId: BB15_STRATEGY_ID,
    strategyLabel: "BB15 Cambio tendencia 15m",
    requirementId: "r4",
  },
];

export const TIMEFRAME_FILTER_OPTIONS: { value: TestingTimeframe; label: string }[] = [
  { value: "all", label: "Todas las temporalidades" },
  { value: "15m", label: "15 min" },
  { value: "1h", label: "Hora (1h)" },
  { value: "D", label: "Día" },
];

export function timeframeLabel(tf: string): string {
  switch (tf) {
    case "15m":
      return "15 min";
    case "1h":
    case "H":
      return "Hora";
    case "D":
      return "Día";
    case "execution":
      return "Ejecución";
    default:
      return tf;
  }
}

function strategyDisplayName(strategyId: string): string {
  return STRATEGY_CANONICAL_NAMES[strategyId] ?? strategyId;
}

function optionIdFor(strategyId: string, variantId?: string): string {
  return variantId ? `${strategyId}:${variantId}` : strategyId;
}

function reqToCheck(
  req: StrategyPlaybookRequirement,
  strategyId: string,
  strategyLabel: string,
  variantId?: string,
  variantName?: string
): TestingCriteriaCheck {
  return {
    checkId: `${strategyId}${variantId ? `:${variantId}` : ""}:${req.ruleKey}:${req.id}`,
    ruleKey: req.ruleKey,
    label: req.label,
    timeframe: req.timeframe,
    automatable: req.automatable,
    strategyId,
    strategyLabel,
    variantId,
    variantName,
    requirementId: req.id,
    classification: req.classification ?? "mandatory",
    supportBonusPct: req.supportBonusPct,
  };
}

export function buildTestingCatalogFromPlaybooks(playbooks: StrategyPlaybook[]): {
  strategies: TestingStrategyOption[];
  checks: TestingCriteriaCheck[];
} {
  const strategies: TestingStrategyOption[] = [
    NO_STRATEGY_OPTION,
    {
      optionId: BB15_STRATEGY_ID,
      strategyId: BB15_STRATEGY_ID,
      label: "BB15 · Cambio tendencia 15m (automático)",
      isBb15: true,
    },
  ];
  const checks: TestingCriteriaCheck[] = [...BB15_CRITERIA_CHECKS];

  for (const pb of playbooks) {
    const baseLabel = strategyDisplayName(pb.id);
    if (pb.variants?.length) {
      for (const variant of pb.variants) {
        const optionId = optionIdFor(pb.id, variant.id);
        strategies.push({
          optionId,
          strategyId: pb.id,
          label: `${baseLabel} · ${variant.name}`,
          variantId: variant.id,
          variantName: variant.name,
        });
        for (const req of variant.requirements) {
          if (!isIsolatedTestableRequirement(req.ruleKey)) continue;
          checks.push(reqToCheck(req, pb.id, baseLabel, variant.id, variant.name));
        }
      }
    } else {
      strategies.push({
        optionId: pb.id,
        strategyId: pb.id,
        label: baseLabel,
      });
      for (const req of pb.requirements) {
        if (!isIsolatedTestableRequirement(req.ruleKey)) continue;
        checks.push(reqToCheck(req, pb.id, baseLabel));
      }
    }
  }

  return { strategies, checks };
}

export function isNoStrategyOption(option: TestingStrategyOption | undefined): boolean {
  return option?.isNoStrategy === true || option?.optionId === NO_STRATEGY_OPTION_ID;
}

export function findStrategyOption(
  strategies: TestingStrategyOption[],
  optionId: string
): TestingStrategyOption | undefined {
  return strategies.find((s) => s.optionId === optionId);
}

export function checksForStrategyOption(
  checks: TestingCriteriaCheck[],
  option: TestingStrategyOption | undefined
): TestingCriteriaCheck[] {
  if (!option || isNoStrategyOption(option)) return checks;
  return checks.filter((c) => {
    if (c.strategyId !== option.strategyId) return false;
    if (option.variantId) return c.variantId === option.variantId;
    return !c.variantId;
  });
}

export function filterChecksByTimeframe(
  checks: TestingCriteriaCheck[],
  timeframe: TestingTimeframe
): TestingCriteriaCheck[] {
  if (timeframe === "all") return checks;
  return checks.filter((c) => c.timeframe === timeframe);
}

/** One row per FinanceAI rule (timeframe + ruleKey). Playbook variants often repeat the same check. */
export const BB15_RULE_KEY_TO_ITEM_ID: Record<string, string> = {
  open_inside_bb15: "opensInsideBb15m",
  vol_bb_expand_post_open: "volExpandedAfterPremarket",
  bb_mid_cut_15m: "puntoMedioCut",
  trend_cut_counter: "cutsTrendReinforcement",
};

export function findCheckById(
  checks: TestingCriteriaCheck[],
  checkId: string
): TestingCriteriaCheck | undefined {
  if (!checkId) return undefined;
  return checks.find((c) => c.checkId === checkId);
}

export function findCheckByRule(
  checks: TestingCriteriaCheck[],
  params: {
    ruleKey: string;
    strategyId?: string;
    variantId?: string;
    timeframe?: string;
  }
): TestingCriteriaCheck | undefined {
  return checks.find(
    (c) =>
      c.ruleKey === params.ruleKey &&
      (!params.strategyId || c.strategyId === params.strategyId) &&
      (!params.variantId || c.variantId === params.variantId) &&
      (!params.timeframe || c.timeframe === params.timeframe)
  );
}

export function checkMatchesCatalog(
  item: { ruleKey?: string | null; timeframe?: string | null },
  selected: TestingCriteriaCheck
): boolean {
  if ((item.ruleKey ?? "") !== selected.ruleKey) return false;
  if (!selected.timeframe || !item.timeframe) return true;
  return item.timeframe === selected.timeframe;
}

export function uniqueChecksForDropdown(checks: TestingCriteriaCheck[]): TestingCriteriaCheck[] {
  const byKey = new Map<string, TestingCriteriaCheck>();
  for (const c of checks) {
    const key = `${c.timeframe}:${c.ruleKey}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, c);
      continue;
    }
    if (c.label.length < existing.label.length) {
      byKey.set(key, c);
    }
  }
  return [...byKey.values()].sort((a, b) => {
    const tf = a.timeframe.localeCompare(b.timeframe);
    if (tf !== 0) return tf;
    return a.label.localeCompare(b.label);
  });
}

export type StrategyRequirementGroup = {
  groupId: string;
  strategyId: string;
  strategyLabel: string;
  variantId?: string;
  variantName?: string;
  optionId: string;
  mandatoryRequirements: TestingCriteriaCheck[];
  supportRequirements: TestingCriteriaCheck[];
  /** @deprecated use mandatoryRequirements + supportRequirements */
  requirements: TestingCriteriaCheck[];
};

function sortChecks(a: TestingCriteriaCheck, b: TestingCriteriaCheck): number {
  const aNum = a.requirementId?.match(/-req(\d+)$/)?.[1];
  const bNum = b.requirementId?.match(/-req(\d+)$/)?.[1];
  if (aNum && bNum) {
    const n = Number(aNum) - Number(bNum);
    if (n !== 0) return n;
  }
  const tf = a.timeframe.localeCompare(b.timeframe);
  if (tf !== 0) return tf;
  return (a.requirementId ?? a.label).localeCompare(b.requirementId ?? b.label);
}

/** Full SR catalog grouped by strategy / variant (for UI list + API testing). */
export function groupStrategyRequirements(
  checks: TestingCriteriaCheck[],
  strategies: TestingStrategyOption[]
): StrategyRequirementGroup[] {
  const playbookChecks = checks.filter((c) => c.strategyId !== NO_STRATEGY_OPTION_ID);
  const groups: StrategyRequirementGroup[] = [];
  const seen = new Set<string>();

  for (const option of strategies) {
    if (isNoStrategyOption(option)) continue;
    const groupId = option.optionId;
    if (seen.has(groupId)) continue;
    const reqs = checksForStrategyOption(playbookChecks, option);
    if (reqs.length === 0) continue;
    const mandatoryRequirements = reqs
      .filter((c) => (c.classification ?? "mandatory") === "mandatory")
      .sort(sortChecks);
    const supportRequirements = reqs
      .filter((c) => c.classification === "support")
      .sort(sortChecks);
    seen.add(groupId);
    groups.push({
      groupId,
      strategyId: option.strategyId,
      strategyLabel: option.label,
      variantId: option.variantId,
      variantName: option.variantName,
      optionId: option.optionId,
      mandatoryRequirements,
      supportRequirements,
      requirements: [...mandatoryRequirements, ...supportRequirements],
    });
  }

  return groups.sort((a, b) => a.strategyLabel.localeCompare(b.strategyLabel));
}

/** Payload sent to POST /rules/check */
export function rulesApiPayload(check: TestingCriteriaCheck) {
  return {
    ruleKey: check.ruleKey,
    timeframe: check.timeframe,
    label: check.label,
    strategyId: check.strategyId,
    ...(check.variantId ? { variantId: check.variantId } : {}),
    ...(check.requirementId ? { requirementId: check.requirementId } : {}),
    automatable: check.automatable,
    ...(check.classification ? { classification: check.classification } : {}),
    ...(check.supportBonusPct != null ? { supportBonusPct: check.supportBonusPct } : {}),
  };
}

/** E01 — when trend SRs pass, propose broker entry (not a testable isolated SR). */
export function proposedExecutionFromCheck(check: TestingCriteriaCheck | undefined): string | null {
  if (!check || check.strategyId !== "estrategia-01") return null;
  const blob = `${check.variantName ?? ""} ${check.variantId ?? ""} ${check.label}`.toUpperCase();
  if (/\bPUT\b/.test(blob) || check.variantId?.includes("baja")) return "PUT en broker";
  if (/\bCALL\b/.test(blob) || check.variantId?.includes("alza")) return "CALL en broker";
  return null;
}
