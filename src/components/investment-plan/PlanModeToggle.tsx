"use client";

import Link from "next/link";
import {
  planInversionHref,
  PLAN_MODE_LABELS,
  type InvestmentPlanModeKey,
  type PlanAccountKey,
} from "@/lib/investment-plan";

type Props = {
  activeMode: InvestmentPlanModeKey;
  activeAccount: PlanAccountKey;
  showRealTotal?: boolean;
};

export function PlanModeToggle({ activeMode, activeAccount, showRealTotal }: Props) {
  return (
    <div className="inline-flex rounded-lg border border-investep-navy/25 overflow-hidden text-sm">
      {(["P35", "P10"] as const).map((mode) => {
        const active = activeMode === mode;
        return (
          <Link
            key={mode}
            href={planInversionHref(mode, activeAccount, showRealTotal)}
            className={`px-4 py-2 font-medium transition-colors ${
              active
                ? mode === "P35"
                  ? "bg-investep-gold text-investep-navy"
                  : "bg-investep-navy text-white"
                : "bg-white text-investep-navy hover:bg-gray-50"
            }`}
            aria-current={active ? "page" : undefined}
          >
            {PLAN_MODE_LABELS[mode]}
          </Link>
        );
      })}
    </div>
  );
}
