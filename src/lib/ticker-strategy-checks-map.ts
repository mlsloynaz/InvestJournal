import type { FinanceAiStrategyCheckItem } from "@/lib/finance-ai-types";
import type { Bb15RuleItem } from "@/lib/bb15-fast-display";
import type {
  CollapsedRuleIconItem,
  TickerStrategyCheckItem,
  TickerStrategyCheckStatus,
} from "@/lib/movement-ticker-badge-types";

export function checklistStatusToStrategyCheck(
  status: FinanceAiStrategyCheckItem["status"] | undefined,
  hasItem: boolean
): TickerStrategyCheckStatus {
  if (!hasItem) return "not_met";
  if (status === "met") return "met";
  if (status === "partial") return "partial";
  if (status === "manual") return "pending";
  if (status === "unknown") return "not_met";
  return "not_met";
}

export function strategyChecksFromRuleKeys(
  checklist: FinanceAiStrategyCheckItem[] | undefined,
  ruleKeys: readonly string[]
): TickerStrategyCheckItem[] {
  const items = checklist ?? [];
  return ruleKeys.map((ruleKey) => {
    const item = items.find((i) => i.ruleKey === ruleKey);
    const label = item?.label?.trim() || ruleKey;
    return {
      id: ruleKey,
      label,
      status: checklistStatusToStrategyCheck(item?.status, Boolean(item)),
    };
  });
}

export function bb15RuleToStrategyCheck(rule: Bb15RuleItem): TickerStrategyCheckItem {
  let status: TickerStrategyCheckStatus = "not_met";
  if (rule.met === true) status = "met";
  else if (rule.aboutToCross) status = "about_to_cross";
  else if (rule.probable) status = "partial";
  else if (rule.pending) status = "pending";
  return { id: rule.id, label: rule.label, status };
}

export function collapsedRuleToStrategyCheck(rule: CollapsedRuleIconItem): TickerStrategyCheckItem {
  let status: TickerStrategyCheckStatus = "not_met";
  if (rule.met === true) status = "met";
  else if (rule.aboutToCross) status = "about_to_cross";
  else if (rule.probable) status = "partial";
  else if (rule.pending) status = "pending";
  return { id: rule.id, label: rule.label, status };
}

export function collapsedRulesToStrategyChecks(
  rules: CollapsedRuleIconItem[]
): TickerStrategyCheckItem[] {
  return rules.map(collapsedRuleToStrategyCheck);
}
