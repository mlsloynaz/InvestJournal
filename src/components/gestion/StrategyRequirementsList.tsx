"use client";

import { StrategyCheckIcon } from "@/components/gestion/TickerStrategyChecks";
import type { TickerStrategyCheckStatus } from "@/lib/movement-ticker-badge-types";
import {
  strategyRuleMetAtLabel,
  strategyRulesForDisplay,
  type StrategyRuleDisplay,
} from "@/lib/strategy-display";
import type { FinanceAiStrategyFit } from "@/lib/finance-ai-types";

function toneToCheckStatus(tone: StrategyRuleDisplay["tone"]): TickerStrategyCheckStatus | "expired" {
  if (tone === "met") return "met";
  if (tone === "near") return "partial";
  if (tone === "expired") return "expired";
  return "not_met";
}

function RuleStatusIcon({ tone }: { tone: StrategyRuleDisplay["tone"] }) {
  const mapped = toneToCheckStatus(tone);
  if (mapped === "expired") {
    return (
      <span className="inline-flex w-3.5 text-red-700 font-bold leading-none" aria-hidden>
        ✗
      </span>
    );
  }
  return <StrategyCheckIcon status={mapped} />;
}

function toneClassName(tone: StrategyRuleDisplay["tone"]): string {
  if (tone === "met") return "text-green-800";
  if (tone === "expired") return "text-red-800";
  if (tone === "near") return "text-sky-900";
  return "text-amber-900";
}

function StrategyRequirementRow({
  row,
  highlightRuleKey,
}: {
  row: StrategyRuleDisplay;
  highlightRuleKey?: string;
}) {
  const isHighlight = highlightRuleKey != null && row.item.ruleKey === highlightRuleKey;
  const metAt = strategyRuleMetAtLabel(row.item);

  return (
    <li
      className={`flex gap-1.5 ${toneClassName(row.tone)} ${
        isHighlight ? "rounded border border-amber-300 bg-amber-50/80 px-1.5 py-1 -mx-1.5" : ""
      }`}
    >
      <span className="shrink-0 font-medium mt-px" aria-hidden>
        <RuleStatusIcon tone={row.tone} />
      </span>
      <span className="min-w-0 flex-1">
        <span className={isHighlight ? "font-semibold" : undefined}>
          {row.label}
          {isHighlight && highlightRuleKey === "bb_exposure" ? " · 15m fuera de BB" : null}
        </span>
        {row.tone === "near" && <span className="text-sky-800 font-medium"> · cerca</span>}
        {row.tone === "confirm" && (
          <span className="text-amber-700 font-medium"> · confirmar</span>
        )}
        {row.tone === "expired" && (
          <span className="text-red-700 font-medium"> · no operar</span>
        )}
        {row.tone === "met" && metAt && (
          <span className="block text-[10px] text-green-700/90 font-normal mt-0.5 tabular-nums">
            Fit {metAt}
          </span>
        )}
        {row.tone === "met" && row.item.evidence && (
          <span className="block text-[10px] text-green-700/80 font-normal mt-0.5">
            {row.item.evidence}
          </span>
        )}
      </span>
    </li>
  );
}

function renderRuleList(rules: StrategyRuleDisplay[], highlightRuleKey?: string) {
  return (
    <ul className="space-y-1">
      {rules.map((row, index) => (
        <StrategyRequirementRow
          key={`${row.item.requirementId ?? row.item.ruleKey ?? row.label}-${index}`}
          row={row}
          highlightRuleKey={highlightRuleKey}
        />
      ))}
    </ul>
  );
}

export type StrategyRequirementsListProps = {
  rules: StrategyRuleDisplay[];
  className?: string;
  /** Split met vs not-met like Mov15 RulesBlock. */
  groupMet?: boolean;
  highlightRuleKey?: string;
};

/** Shared checklist rows — ✓/○/◐ + optional Fit HH:mm ET (FinanceAI `metAtEt`). */
export function StrategyRequirementsList({
  rules,
  className = "",
  groupMet = false,
  highlightRuleKey,
}: StrategyRequirementsListProps) {
  if (rules.length === 0) return null;

  if (!groupMet) {
    return (
      <div className={className}>
        {renderRuleList(rules, highlightRuleKey)}
      </div>
    );
  }

  const met = rules.filter((r) => r.tone === "met");
  const notMet = rules.filter((r) => r.tone !== "met");

  return (
    <div className={`space-y-2 ${className}`.trim()}>
      {met.length > 0 && (
        <div>
          <p className="text-[9px] font-semibold text-green-700 mb-0.5">
            Cumple ({met.length})
          </p>
          {renderRuleList(met, highlightRuleKey)}
        </div>
      )}
      {notMet.length > 0 && (
        <div>
          <p className="text-[9px] font-semibold text-orange-600 mb-0.5">
            No cumple ({notMet.length})
          </p>
          {renderRuleList(notMet, highlightRuleKey)}
        </div>
      )}
      {met.length === 0 && notMet.length === 0 && renderRuleList(rules, highlightRuleKey)}
    </div>
  );
}

/** Convenience wrapper from `FinanceAiStrategyFit.checklist`. */
export function StrategyRequirementsListFromFit({
  strategy,
  className,
  groupMet,
  highlightRuleKey,
}: {
  strategy: FinanceAiStrategyFit;
  className?: string;
  groupMet?: boolean;
  highlightRuleKey?: string;
}) {
  const rules = strategyRulesForDisplay(strategy);
  return (
    <StrategyRequirementsList
      rules={rules}
      className={className}
      groupMet={groupMet}
      highlightRuleKey={highlightRuleKey}
    />
  );
}
