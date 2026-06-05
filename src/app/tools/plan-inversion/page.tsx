import { PlanAccountToggle } from "@/components/investment-plan/PlanAccountToggle";
import { PlanEarningsReport } from "@/components/investment-plan/PlanEarningsReport";
import { PlanEntryForm } from "@/components/investment-plan/PlanEntryForm";
import { PlanModeToggle } from "@/components/investment-plan/PlanModeToggle";
import { PlanMonthSection } from "@/components/investment-plan/PlanMonthSection";
import { PlanPrintReportButton } from "@/components/investment-plan/PlanPrintReportButton";
import { PlanRealTotalPanel } from "@/components/investment-plan/PlanRealTotalPanel";
import { InvestmentPlanSettingsForm } from "@/components/investment-plan/InvestmentPlanSettingsForm";
import { PlanTrackInitialPanel } from "@/components/investment-plan/PlanTrackInitialPanel";
import { getDbErrorMessage } from "@/lib/db-error";
import { formatMoney, PLAN_ACCOUNT_LABELS, PLAN_MODE_LABELS } from "@/lib/investment-plan";
import { getInvestmentPlanPageData } from "@/server/actions/investment-plan";

type Props = {
  searchParams: Promise<{ mode?: string; account?: string; showRealTotal?: string }>;
};

export default async function PlanInversionPage({ searchParams }: Props) {
  const { mode: modeParam, account: accountParam, showRealTotal: showRealTotalParam } =
    await searchParams;
  const showRealTotal = showRealTotalParam === "1";

  try {
    const data = await getInvestmentPlanPageData(modeParam, accountParam);

    return (
      <div className="space-y-6 max-w-5xl plan-inversion-page">
        <header className="flex flex-wrap justify-between gap-4 items-start print:hidden">
          <div>
            <h1 className="text-2xl font-bold text-investep-navy">Plan de inversión anual</h1>
            <p className="text-sm text-gray-600 mt-1">
              {PLAN_MODE_LABELS[data.mode]} · {PLAN_ACCOUNT_LABELS[data.account]}
            </p>
          </div>
          <div className="flex flex-col gap-2 items-end">
            <PlanModeToggle
              activeMode={data.mode}
              activeAccount={data.account}
              showRealTotal={showRealTotal}
            />
            <PlanAccountToggle
              activeMode={data.mode}
              activeAccount={data.account}
              showRealTotal={showRealTotal}
            />
          </div>
        </header>

        <div className="print:hidden">
          <InvestmentPlanSettingsForm dailyInvestPercent={data.config.dailyInvestPercent} />
        </div>

        <div className="print:hidden">
          <PlanTrackInitialPanel
            mode={data.mode}
            account={data.account}
            initialCapital={data.trackInitial?.initialCapital ?? null}
            setAt={data.trackInitial?.setAt ?? null}
          />
        </div>

        <div className="print:hidden">
          <PlanRealTotalPanel
            mode={data.mode}
            account={data.account}
            totalRealEarnings={data.totalRealEarnings}
            today={data.today}
            showRealTotal={showRealTotal}
          />
        </div>

        {data.hasTrackInitial && data.priorCapital != null && data.suggested && (
          <div className="print:hidden">
            <PlanEntryForm
              mode={data.mode}
              account={data.account}
              priorCapital={data.priorCapital}
              suggestedInvest={data.suggested.investAmount}
              suggestedRentabilidad={data.suggested.rentabilidad}
              tickers={data.tickers}
            />
          </div>
        )}

        {data.months.length === 0 ? (
          data.hasTrackInitial ? (
            <p className="text-sm text-gray-500 text-center py-8 bg-white border rounded-lg print:hidden">
              Aún no hay entradas {PLAN_ACCOUNT_LABELS[data.account].toLowerCase()} en{" "}
              {PLAN_MODE_LABELS[data.mode]}.
            </p>
          ) : null
        ) : (
          <div className="space-y-6 print:hidden">
            {data.months.map((month) => (
              <PlanMonthSection key={month.yearMonth} mode={data.mode} month={month} />
            ))}
          </div>
        )}

        <div className="flex justify-end print:hidden">
          <PlanPrintReportButton />
        </div>

        <PlanEarningsReport
          mode={data.mode}
          account={data.account}
          today={data.today}
          byWeek={data.report.byWeek}
          byTicker={data.report.byTicker}
          totalRentabilidad={data.report.totalRentabilidad}
        />
      </div>
    );
  } catch (e) {
    return (
      <div className="max-w-lg space-y-4">
        <h1 className="text-2xl font-bold text-investep-navy">Plan de inversión</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm space-y-3">
          <p className="font-medium text-red-800">No se pudo cargar el plan</p>
          <p className="text-red-700 text-xs font-mono break-all">{getDbErrorMessage(e)}</p>
          <p className="text-gray-800">Ejecuta:</p>
          <ol className="list-decimal list-inside text-gray-800 space-y-1">
            <li>
              <code className="bg-white px-1">docker compose up -d</code>
            </li>
            <li>
              <code className="bg-white px-1">npm run setup</code>
            </li>
          </ol>
        </div>
      </div>
    );
  }
}
