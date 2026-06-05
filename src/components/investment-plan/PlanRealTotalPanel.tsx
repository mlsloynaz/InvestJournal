"use client";

import Link from "next/link";
import { formatMoney, planInversionHref, type InvestmentPlanModeKey, type PlanAccountKey } from "@/lib/investment-plan";

type Props = {
  mode: InvestmentPlanModeKey;
  account: PlanAccountKey;
  totalRealEarnings: number;
  today: string;
  showRealTotal: boolean;
};

export function PlanRealTotalPanel({
  mode,
  account,
  totalRealEarnings,
  today,
  showRealTotal,
}: Props) {
  const hrefShow = planInversionHref(mode, account, true);
  const hrefHide = planInversionHref(mode, account, false);

  return (
    <section className="bg-white border border-investep-navy/20 rounded-lg p-4 flex flex-wrap justify-between gap-3 items-center">
      <div>
        <p className="text-sm font-semibold text-investep-navy">Total real acumulado</p>
        <p className="text-xs text-gray-600">Solo entradas reales (sin práctica), hasta {today}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {showRealTotal ? (
          <>
            <p className="text-lg font-bold text-investep-navy tabular-nums">
              ${formatMoney(totalRealEarnings)}
            </p>
            <Link href={hrefHide} className="text-sm text-investep-navy underline">
              Ocultar
            </Link>
          </>
        ) : (
          <Link
            href={hrefShow}
            className="text-sm bg-investep-navy text-white px-3 py-1.5 rounded"
          >
            Mostrar total real
          </Link>
        )}
      </div>
    </section>
  );
}
