import { prisma } from "@/lib/db";
import { formatWeekStart, getWeekMeta, getWeekdayDates, parseWeekStart } from "@/lib/week";
import { formatSymbol } from "@/lib/utils";

export async function getOrCreateWeek(weekStartInput: string | Date) {
  const weekStart =
    typeof weekStartInput === "string" ? parseWeekStart(weekStartInput) : weekStartInput;
  const weekStartDate = new Date(formatWeekStart(weekStart) + "T00:00:00.000Z");
  const meta = getWeekMeta(weekStart);

  return prisma.week.upsert({
    where: { weekStartDate },
    create: {
      weekStartDate,
      year: meta.year,
      isoWeek: meta.isoWeek,
    },
    update: {},
  });
}

export async function ensureTickerWeek(symbol: string, weekStartInput: string) {
  const normalized = formatSymbol(symbol);
  const week = await getOrCreateWeek(weekStartInput);
  const weekStart = parseWeekStart(weekStartInput);

  const ticker = await prisma.ticker.upsert({
    where: { symbol: normalized },
    create: { symbol: normalized },
    update: {},
  });

  let tickerWeek = await prisma.tickerWeek.findUnique({
    where: {
      tickerId_weekId: { tickerId: ticker.id, weekId: week.id },
    },
    include: {
      weeklyChecklist: true,
      dailyMetrics: { orderBy: { dayOfWeek: "asc" } },
      trades: { orderBy: { id: "asc" } },
      ticker: true,
      week: true,
    },
  });

  if (!tickerWeek) {
    tickerWeek = await prisma.tickerWeek.create({
      data: {
        tickerId: ticker.id,
        weekId: week.id,
        weeklyChecklist: { create: {} },
        dailyMetrics: {
          create: getWeekdayDates(weekStart).map((tradeDate, index) => ({
            tradeDate: new Date(formatWeekStart(tradeDate) + "T00:00:00.000Z"),
            dayOfWeek: index + 1,
          })),
        },
      },
      include: {
        weeklyChecklist: true,
        dailyMetrics: { orderBy: { dayOfWeek: "asc" } },
        trades: { orderBy: { id: "asc" } },
        ticker: true,
        week: true,
      },
    });
  } else if (!tickerWeek.weeklyChecklist) {
    await prisma.weeklyChecklist.create({
      data: { tickerWeekId: tickerWeek.id },
    });
    tickerWeek = await prisma.tickerWeek.findUniqueOrThrow({
      where: { id: tickerWeek.id },
      include: {
        weeklyChecklist: true,
        dailyMetrics: { orderBy: { dayOfWeek: "asc" } },
        trades: { orderBy: { id: "asc" } },
        ticker: true,
        week: true,
      },
    });
  }

  return tickerWeek;
}

export async function listTickerWeeksForDashboard(limit = 12) {
  return prisma.tickerWeek.findMany({
    take: limit,
    orderBy: { updatedAt: "desc" },
    include: {
      ticker: true,
      week: true,
      trades: true,
    },
  });
}
