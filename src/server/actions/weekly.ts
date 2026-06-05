"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { formatSymbol, parseOptionalDecimal } from "@/lib/utils";
import { metValueSchema } from "@/lib/validators";
import { ensureTickerWeek } from "@/server/services/ticker-week";

function revalidateTickerWeekPaths(symbol: string, weekStart: string) {
  const base = `/tickers/${symbol}/weeks/${weekStart}`;
  revalidatePath(base);
  revalidatePath(`/tickers/${symbol}`);
  revalidatePath("/");
}

export async function saveTickerWeekHeader(formData: FormData): Promise<void> {
  const symbol = formatSymbol(String(formData.get("symbol")));
  const weekStart = String(formData.get("weekStart"));
  const tickerWeek = await ensureTickerWeek(symbol, weekStart);

  await prisma.tickerWeek.update({
    where: { id: tickerWeek.id },
    data: {
      priceRangeLow: parseOptionalDecimal(String(formData.get("priceRangeLow") ?? "")),
      priceRangeHigh: parseOptionalDecimal(String(formData.get("priceRangeHigh") ?? "")),
      headerNotes: String(formData.get("headerNotes") ?? "") || null,
    },
  });

  revalidateTickerWeekPaths(symbol, weekStart);
}

export async function saveWeeklyChecklist(formData: FormData): Promise<void> {
  const symbol = formatSymbol(String(formData.get("symbol")));
  const weekStart = String(formData.get("weekStart"));
  const tickerWeek = await ensureTickerWeek(symbol, weekStart);

  const fedMet = metValueSchema.parse(String(formData.get("fedMet") ?? ""));
  const earningsMet = metValueSchema.parse(String(formData.get("earningsMet") ?? ""));
  const bollingerMet = metValueSchema.parse(String(formData.get("bollingerMet") ?? ""));
  const maMet = metValueSchema.parse(String(formData.get("maMet") ?? ""));
  const trendBreakMet = metValueSchema.parse(String(formData.get("trendBreakMet") ?? ""));
  const gapUpMet = metValueSchema.parse(String(formData.get("gapUpMet") ?? ""));
  const gapDownMet = metValueSchema.parse(String(formData.get("gapDownMet") ?? ""));
  const bidAskMet = metValueSchema.parse(String(formData.get("bidAskMet") ?? ""));

  const nextEarningsRaw = String(formData.get("nextEarningsDate") ?? "");
  const nextEarningsDate = nextEarningsRaw ? new Date(nextEarningsRaw + "T00:00:00.000Z") : null;

  await prisma.weeklyChecklist.upsert({
    where: { tickerWeekId: tickerWeek.id },
    create: {
      tickerWeekId: tickerWeek.id,
      fedMet,
      fedNote: String(formData.get("fedNote") ?? "") || null,
      earningsMet,
      earningsNote: String(formData.get("earningsNote") ?? "") || null,
      nextEarningsDate,
      bollingerMet,
      bollingerMidpointNote: String(formData.get("bollingerMidpointNote") ?? "") || null,
      maMet,
      maTimeframes: String(formData.get("maTimeframes") ?? "") || null,
      trendBreakMet,
      trendBreakNote: String(formData.get("trendBreakNote") ?? "") || null,
      gapUpMet,
      gapDownMet,
      gapNote: String(formData.get("gapNote") ?? "") || null,
      bidAskMet,
      bid: parseOptionalDecimal(String(formData.get("bidAskDifference") ?? "")),
      ask: null,
    },
    update: {
      fedMet,
      fedNote: String(formData.get("fedNote") ?? "") || null,
      earningsMet,
      earningsNote: String(formData.get("earningsNote") ?? "") || null,
      nextEarningsDate,
      bollingerMet,
      bollingerMidpointNote: String(formData.get("bollingerMidpointNote") ?? "") || null,
      maMet,
      maTimeframes: String(formData.get("maTimeframes") ?? "") || null,
      trendBreakMet,
      trendBreakNote: String(formData.get("trendBreakNote") ?? "") || null,
      gapUpMet,
      gapDownMet,
      gapNote: String(formData.get("gapNote") ?? "") || null,
      bidAskMet,
      bid: parseOptionalDecimal(String(formData.get("bidAskDifference") ?? "")),
      ask: null,
    },
  });

  revalidateTickerWeekPaths(symbol, weekStart);
}

export async function saveDailyMetric(formData: FormData): Promise<void> {
  const symbol = formatSymbol(String(formData.get("symbol")));
  const weekStart = String(formData.get("weekStart"));
  const metricId = Number(formData.get("metricId"));
  await ensureTickerWeek(symbol, weekStart);

  await prisma.dailyMetric.update({
    where: { id: metricId },
    data: {
      distance: parseOptionalDecimal(String(formData.get("distance") ?? "")),
      spotPrice: parseOptionalDecimal(String(formData.get("spotPrice") ?? "")),
      strikePrice: parseOptionalDecimal(String(formData.get("strikePrice") ?? "")),
    },
  });

  revalidateTickerWeekPaths(symbol, weekStart);
}
