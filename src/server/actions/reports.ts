"use server";

import { prisma } from "@/lib/db";

export async function getComplianceReport() {
  const rows = await prisma.tickerWeek.findMany({
    include: {
      ticker: true,
      week: true,
      weeklyChecklist: true,
      trades: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  return rows.map((tw) => {
    const c = tw.weeklyChecklist;
    const fields = c
      ? [
          c.fedMet,
          c.earningsMet,
          c.bollingerMet,
          c.maMet,
          c.trendBreakMet,
          c.gapUpMet,
          c.gapDownMet,
          c.bidAskMet,
        ]
      : [];
    const evaluated = fields.filter((v) => v !== null).length;
    const met = fields.filter((v) => v === true).length;
    const pnl = tw.trades.reduce(
      (sum, t) => sum + (t.profitabilityUsd ? Number(t.profitabilityUsd) : 0),
      0
    );

    return {
      symbol: tw.ticker.symbol,
      weekStart: tw.week.weekStartDate.toISOString().slice(0, 10),
      met,
      evaluated,
      compliancePct: evaluated > 0 ? Math.round((met / evaluated) * 100) : null,
      tradeCount: tw.trades.length,
      totalPnl: pnl,
    };
  });
}

export async function getAnalysisTypeReport() {
  return prisma.analysisEntry.groupBy({
    by: ["type"],
    _count: { _all: true },
  });
}
