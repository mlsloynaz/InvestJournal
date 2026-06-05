import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { TickerNav } from "@/components/layout/TickerNav";
import { WeekPicker } from "@/components/layout/WeekPicker";
import { getTickerBySymbol } from "@/server/actions/tickers";
import { getAnalysisStats } from "@/server/actions/analysis";
import { formatWeekStart, getWeekStart } from "@/lib/week";
import { formatSymbol } from "@/lib/utils";

type Props = {
  params: Promise<{ symbol: string }>;
};

export default async function TickerHubPage({ params }: Props) {
  const { symbol: raw } = await params;
  const symbol = formatSymbol(raw);
  const weekStart = formatWeekStart(getWeekStart());

  let ticker: Awaited<ReturnType<typeof getTickerBySymbol>>;
  try {
    ticker = await getTickerBySymbol(symbol);
  } catch {
    return (
      <p className="text-sm text-red-700">
        Base de datos no disponible. Ver README para setup.
      </p>
    );
  }
  if (!ticker) notFound();

  const stats = await getAnalysisStats(ticker.id);
  const today = format(new Date(), "yyyy-MM-dd");

  return (
    <div className="max-w-4xl space-y-6">
      <header className="flex flex-wrap justify-between gap-4 items-start">
        <div>
          <h1 className="text-2xl font-bold text-investep-navy">{symbol}</h1>
          {ticker.name && <p className="text-gray-600">{ticker.name}</p>}
        </div>
        <WeekPicker currentWeekStart={weekStart} basePath={`/tickers/${symbol}/weeks`} />
      </header>

      <TickerNav symbol={symbol} active="hub" weekStart={weekStart} />

      <div className="grid sm:grid-cols-3 gap-3">
        <StatCard label="Semanas" value={ticker._count.tickerWeeks} />
        <StatCard label="Análisis" value={ticker._count.analysisEntries} />
        <StatCard label="Earnings" value={ticker._count.earningsEvents} />
      </div>

      {stats.length > 0 && (
        <div className="text-sm bg-white border rounded p-4">
          <p className="font-medium mb-2">Análisis por tipo</p>
          <ul className="flex gap-4">
            {stats.map((s) => (
              <li key={s.type}>
                {s.type}: {s._count._all}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <Link
          href={`/tickers/${symbol}/weeks/${weekStart}`}
          className="bg-investep-navy text-white px-4 py-2 rounded text-sm"
        >
          Abrir análisis básico — semana {weekStart}
        </Link>
        <Link
          href={`/tickers/${symbol}/analysis`}
          className="bg-investep-gold text-investep-navy px-4 py-2 rounded text-sm font-semibold"
        >
          + Agregar nota (Nota / Predicción / Error)
        </Link>
      </div>

      <p className="text-xs text-gray-500">Hoy: {today}</p>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white border rounded p-3 text-center">
      <p className="text-2xl font-bold text-investep-navy">{value}</p>
      <p className="text-xs text-gray-600">{label}</p>
    </div>
  );
}
