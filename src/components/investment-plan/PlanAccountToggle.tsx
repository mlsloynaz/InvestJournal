"use client";

import Link from "next/link";
import {
  planInversionHref,
  PLAN_ACCOUNT_LABELS,
  type InvestmentPlanModeKey,
  type PlanAccountKey,
} from "@/lib/investment-plan";

type Props = {
  activeMode: InvestmentPlanModeKey;
  activeAccount: PlanAccountKey;
  showRealTotal?: boolean;
};

export function PlanAccountToggle({ activeMode, activeAccount, showRealTotal }: Props) {
  return (
    <div className="inline-flex rounded-lg border border-investep-navy/25 overflow-hidden text-sm">
      {(["real", "practice"] as const).map((account) => {
        const active = activeAccount === account;
        return (
          <Link
            key={account}
            href={planInversionHref(activeMode, account, showRealTotal)}
            className={`px-4 py-2 font-medium transition-colors ${
              active
                ? account === "real"
                  ? "bg-investep-navy text-white"
                  : "bg-amber-100 text-amber-950 border-amber-300"
                : "bg-white text-investep-navy hover:bg-gray-50"
            }`}
            aria-current={active ? "page" : undefined}
          >
            {PLAN_ACCOUNT_LABELS[account]}
          </Link>
        );
      })}
    </div>
  );
}
