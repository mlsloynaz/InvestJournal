import Link from "next/link";

export type TickerTileData = {
  symbol: string;
  name: string | null;
  noteCount: number;
  hasCurrentWeek: boolean;
  weekPnl: number | null;
  tradeCount: number;
  weekStart: string;
  priceRange: string | null;
  priceRangeWeekStart: string | null;
};

export function TickerTile({
  symbol,
  name,
  noteCount,
  hasCurrentWeek,
  weekPnl,
  tradeCount,
  weekStart,
  priceRange,
  priceRangeWeekStart,
}: TickerTileData) {
  const base = `/tickers/${symbol}`;
  const pnlClass =
    weekPnl == null ? "text-gray-500" : weekPnl >= 0 ? "text-green-800" : "text-red-800";
  const rangeFromOtherWeek =
    priceRangeWeekStart != null && priceRangeWeekStart !== weekStart;

  return (
    <article className="bg-white border border-investep-navy/15 rounded-md hover:border-investep-gold/60 transition-colors">
      <div className="flex items-center gap-2 px-3 py-2">
        <Link href={base} className="min-w-0 flex-1 group">
          <div className="flex items-baseline gap-2">
            <span className="font-bold text-sm text-investep-navy group-hover:text-investep-gold">
              {symbol}
            </span>
            {name && <span className="text-xs text-gray-500 truncate">{name}</span>}
          </div>
          {priceRange && (
            <p className="text-xs text-investep-navy mt-0.5">
              <span className="text-gray-500">Rango:</span>{" "}
              <span className="font-semibold">{priceRange}</span>
              {rangeFromOtherWeek && (
                <span className="text-gray-400 ml-1">· sem {priceRangeWeekStart}</span>
              )}
            </p>
          )}
          <p className="text-xs text-gray-600 mt-0.5">
            <span className={`font-semibold ${pnlClass}`}>
              {weekPnl != null ? `$${weekPnl.toFixed(2)}` : "—"}
            </span>
            {tradeCount > 0 && <span className="text-gray-400"> · {tradeCount} ops</span>}
            <span className="text-gray-400"> · </span>
            {noteCount} notas
            {!hasCurrentWeek && (
              <span className="text-amber-700 ml-1">· sin semana</span>
            )}
          </p>
        </Link>
        <nav className="flex shrink-0 flex-col gap-0.5 text-[10px] font-medium">
          <Link
            href={`${base}/weeks/${weekStart}`}
            className="text-investep-navy hover:text-investep-gold whitespace-nowrap"
          >
            Semana
          </Link>
          <Link
            href={`${base}/analysis`}
            className="text-investep-navy hover:text-investep-gold whitespace-nowrap"
          >
            Notas
          </Link>
        </nav>
      </div>
    </article>
  );
}
