import Link from "next/link";
import { format } from "date-fns";
import { DashboardTodayNotes } from "@/components/dashboard/DashboardTodayNotes";
import { TickerSearch } from "@/components/dashboard/TickerSearch";
import { TickerTile } from "@/components/dashboard/TickerTile";
import { formatWeekStart, getWeekStart } from "@/lib/week";
import { listTickers } from "@/server/actions/tickers";
import { listTickersForDashboard, listTodayNotesByTicker } from "@/server/services/dashboard";

export default async function DashboardPage() {
  const weekStart = formatWeekStart(getWeekStart());
  const today = format(new Date(), "yyyy-MM-dd");
  let tickers: Awaited<ReturnType<typeof listTickersForDashboard>> = [];
  let searchTickers: Awaited<ReturnType<typeof listTickers>> = [];
  let todayNotes: Awaited<ReturnType<typeof listTodayNotesByTicker>> = [];

  try {
    [tickers, searchTickers, todayNotes] = await Promise.all([
      listTickersForDashboard(weekStart),
      listTickers(),
      listTodayNotesByTicker(today),
    ]);
  } catch {
    return <DatabaseSetupHint />;
  }

  return (
    <div className="max-w-5xl space-y-8">
      <header className="flex flex-wrap justify-between gap-4 items-end">
        <div>
          <h1 className="text-2xl font-bold text-investep-navy">Dashboard</h1>
          <p className="text-sm text-gray-600 mt-1">
            Semana actual: <strong>{weekStart}</strong> (lunes)
          </p>
        </div>
        <Link
          href="/config/tickers"
          className="text-sm bg-investep-navy text-white px-3 py-2 rounded"
        >
          + Agregar ticker
        </Link>
      </header>

      <section className="print:hidden">
        <TickerSearch
          tickers={searchTickers.map((t) => ({ symbol: t.symbol, name: t.name }))}
        />
      </section>

      <DashboardTodayNotes today={today} groups={todayNotes} />

      {tickers.length === 0 ? (
        <div className="bg-white border rounded-lg p-8 text-center">
          <p className="text-gray-600 mb-4">
            No hay tickers favoritos en el dashboard.
          </p>
          <p className="text-sm text-gray-500 mb-4">
            Marca tickers con ★ en configuración para verlos aquí.
          </p>
          <Link href="/config/tickers" className="text-investep-navy font-medium underline">
            Configurar tickers →
          </Link>
        </div>
      ) : (
        <section>
          <h2 className="text-sm font-semibold text-investep-navy mb-2 uppercase tracking-wide">
            Favoritos
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
            {tickers.map((t) => (
              <TickerTile
                key={t.id}
                symbol={t.symbol}
                name={t.name}
                noteCount={t.noteCount}
                hasCurrentWeek={t.hasCurrentWeek}
                weekPnl={t.weekPnl}
                tradeCount={t.tradeCount}
                weekStart={weekStart}
                priceRange={t.priceRange}
                priceRangeWeekStart={t.priceRangeWeekStart}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function DatabaseSetupHint() {
  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-2xl font-bold text-investep-navy">InvestJournal</h1>
      <p className="text-sm text-gray-700">
        La base de datos no está disponible. Sigue estos pasos:
      </p>
      <ol className="list-decimal list-inside text-sm space-y-2 text-gray-800">
        <li>
          <code className="bg-white px-1">docker compose up -d</code>
        </li>
        <li>
          Copia <code className="bg-white px-1">.env.example</code> a{" "}
          <code className="bg-white px-1">.env</code>
        </li>
        <li>
          <code className="bg-white px-1">npm install</code>
        </li>
        <li>
          <code className="bg-white px-1">npx prisma db push</code>
        </li>
        <li>
          <code className="bg-white px-1">npm run dev</code>
        </li>
      </ol>
    </div>
  );
}
