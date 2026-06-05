import { AnalysisType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { parseWeekStart } from "@/lib/week";

export type TodayNoteView = {
  id: number;
  type: AnalysisType;
  body: string;
  time: string;
  entryAt: string;
};

export type TodayNotesByTicker = {
  symbol: string;
  name: string | null;
  isFavorite: boolean;
  notes: TodayNoteView[];
};

export async function listTodayNotesByTicker(todayIso: string): Promise<TodayNotesByTicker[]> {
  const entryDate = new Date(todayIso + "T00:00:00.000Z");

  const entries = await prisma.analysisEntry.findMany({
    where: { entryDate },
    orderBy: [{ entryAt: "desc" }, { id: "desc" }],
    include: {
      ticker: { select: { symbol: true, name: true, isFavorite: true } },
    },
  });

  const bySymbol = new Map<string, TodayNotesByTicker>();

  for (const entry of entries) {
    const symbol = entry.ticker.symbol;
    let group = bySymbol.get(symbol);
    if (!group) {
      group = {
        symbol,
        name: entry.ticker.name,
        isFavorite: entry.ticker.isFavorite,
        notes: [],
      };
      bySymbol.set(symbol, group);
    }

    group.notes.push({
      id: entry.id,
      type: entry.type,
      body: entry.body,
      entryAt: entry.entryAt.toISOString(),
      time: entry.entryAt.toLocaleTimeString("es", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    });
  }

  const groups = Array.from(bySymbol.values()).map((group) => ({
    ...group,
    notes: group.notes.sort(
      (a, b) => b.entryAt.localeCompare(a.entryAt) || b.id - a.id
    ),
  }));

  return groups.sort((a, b) => {
    const latestA = a.notes[0]?.entryAt ?? "";
    const latestB = b.notes[0]?.entryAt ?? "";
    const byTime = latestB.localeCompare(latestA);
    if (byTime !== 0) return byTime;
    if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
    return a.symbol.localeCompare(b.symbol);
  });
}

function decimalToNumber(value: { toString(): string } | null | undefined): number | null {
  if (value == null) return null;
  const n = Number(value.toString());
  return Number.isFinite(n) ? n : null;
}

function formatPriceRange(
  low: number | null,
  high: number | null
): string | null {
  const lowText = low != null ? low.toString() : null;
  const highText = high != null ? high.toString() : null;

  if (lowText && highText) return `${lowText} – ${highText}`;
  if (lowText) return lowText;
  if (highText) return highText;
  return null;
}

export async function listTickersForDashboard(weekStartInput: string) {
  const weekStart = parseWeekStart(weekStartInput);
  const weekStartDate = new Date(
    weekStart.toISOString().slice(0, 10) + "T00:00:00.000Z"
  );

  const week = await prisma.week.findUnique({
    where: { weekStartDate },
  });

  const tickers = await prisma.ticker.findMany({
    where: { isFavorite: true },
    orderBy: { symbol: "asc" },
    include: {
      _count: {
        select: { analysisEntries: true, tickerWeeks: true },
      },
      tickerWeeks: {
        where: week ? { weekId: week.id } : { id: -1 },
        take: 1,
        include: { trades: true },
      },
    },
  });

  const tickerIds = tickers.map((t) => t.id);
  const rangeWeeks =
    tickerIds.length === 0
      ? []
      : await prisma.tickerWeek.findMany({
          where: {
            tickerId: { in: tickerIds },
            OR: [{ priceRangeLow: { not: null } }, { priceRangeHigh: { not: null } }],
          },
          include: {
            week: { select: { weekStartDate: true } },
          },
          orderBy: [{ week: { weekStartDate: "desc" } }, { updatedAt: "desc" }],
        });

  const latestRangeByTickerId = new Map<number, (typeof rangeWeeks)[number]>();
  for (const tickerWeek of rangeWeeks) {
    if (!latestRangeByTickerId.has(tickerWeek.tickerId)) {
      latestRangeByTickerId.set(tickerWeek.tickerId, tickerWeek);
    }
  }

  return tickers.map((t) => {
    const currentWeek = t.tickerWeeks[0];
    const latestRangeWeek = latestRangeByTickerId.get(t.id);
    const priceRangeLow = decimalToNumber(latestRangeWeek?.priceRangeLow ?? null);
    const priceRangeHigh = decimalToNumber(latestRangeWeek?.priceRangeHigh ?? null);

    const weekPnl =
      currentWeek?.trades.reduce(
        (sum, tr) => sum + (tr.profitabilityUsd ? Number(tr.profitabilityUsd) : 0),
        0
      ) ?? null;
    const tradeCount = currentWeek?.trades.length ?? 0;

    return {
      id: t.id,
      symbol: t.symbol,
      name: t.name,
      noteCount: t._count.analysisEntries,
      hasCurrentWeek: !!currentWeek,
      weekPnl,
      tradeCount,
      priceRange: formatPriceRange(priceRangeLow, priceRangeHigh),
      priceRangeWeekStart: latestRangeWeek
        ? latestRangeWeek.week.weekStartDate.toISOString().slice(0, 10)
        : null,
    };
  });
}
