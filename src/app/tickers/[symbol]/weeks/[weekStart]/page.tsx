import { notFound } from "next/navigation";
import { TickerNav } from "@/components/layout/TickerNav";
import { WeekPicker } from "@/components/layout/WeekPicker";
import { WeekHeaderForm } from "@/components/checklist/WeekHeaderForm";
import { WeeklyChecklistForm } from "@/components/checklist/WeeklyChecklistForm";
import { DailyMetricsGrid } from "@/components/checklist/DailyMetricsGrid";
import { TradesTable } from "@/components/checklist/TradesTable";
import { ensureTickerWeek } from "@/server/services/ticker-week";
import { formatSymbol } from "@/lib/utils";

type Props = {
  params: Promise<{ symbol: string; weekStart: string }>;
};

export default async function WeeklyWorkbookPage({ params }: Props) {
  const { symbol: raw, weekStart } = await params;
  const symbol = formatSymbol(raw);

  let tickerWeek: Awaited<ReturnType<typeof ensureTickerWeek>>;
  try {
    tickerWeek = await ensureTickerWeek(symbol, weekStart);
  } catch {
    notFound();
  }

  return (
    <div className="max-w-5xl space-y-8">
      <header className="flex flex-wrap justify-between gap-4">
        <TickerNav symbol={symbol} active="week" weekStart={weekStart} />
        <WeekPicker
          currentWeekStart={weekStart}
          basePath={`/tickers/${symbol}/weeks`}
        />
      </header>

      <WeekHeaderForm symbol={symbol} weekStart={weekStart} tickerWeek={tickerWeek} />

      <WeeklyChecklistForm
        symbol={symbol}
        weekStart={weekStart}
        checklist={tickerWeek.weeklyChecklist}
      />

      <DailyMetricsGrid
        symbol={symbol}
        weekStart={weekStart}
        metrics={tickerWeek.dailyMetrics}
      />

      <TradesTable symbol={symbol} weekStart={weekStart} trades={tickerWeek.trades} />

      <p className="text-center text-sm text-investep-navy/70 italic">
        Recuerda analizar el panorama completo — Keep it simple.
      </p>
    </div>
  );
}
