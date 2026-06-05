"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { formatSymbol, parseOptionalDecimal, parseOptionalInt } from "@/lib/utils";
import { ensureTickerWeek } from "@/server/services/ticker-week";

function revalidateTradePaths(symbol: string, weekStart: string) {
  revalidatePath(`/tickers/${symbol}/weeks/${weekStart}`);
}

export async function createTrade(formData: FormData): Promise<void> {
  const symbol = formatSymbol(String(formData.get("symbol")));
  const weekStart = String(formData.get("weekStart"));
  const tickerWeek = await ensureTickerWeek(symbol, weekStart);

  const tradeDateRaw = String(formData.get("tradeDate") ?? "");
  const expirationRaw = String(formData.get("expirationDate") ?? "");
  const tradeTimeRaw = String(formData.get("tradeTime") ?? "");

  await prisma.trade.create({
    data: {
      tickerWeekId: tickerWeek.id,
      slot: parseOptionalInt(String(formData.get("slot") ?? "1")) ?? 1,
      expirationDate: expirationRaw
        ? new Date(expirationRaw + "T00:00:00.000Z")
        : null,
      optionType: String(formData.get("optionType") ?? "") || null,
      tradeDate: tradeDateRaw ? new Date(tradeDateRaw + "T00:00:00.000Z") : null,
      tradeTime: tradeTimeRaw
        ? new Date(`1970-01-01T${tradeTimeRaw.length === 5 ? tradeTimeRaw + ":00" : tradeTimeRaw}Z`)
        : null,
      contracts: parseOptionalInt(String(formData.get("contracts") ?? "")),
      tradePrice: parseOptionalDecimal(String(formData.get("tradePrice") ?? "")),
      profitabilityUsd: parseOptionalDecimal(String(formData.get("profitabilityUsd") ?? "")),
      planPercent: parseOptionalDecimal(String(formData.get("planPercent") ?? "")),
    },
  });

  revalidateTradePaths(symbol, weekStart);
}

export async function deleteTrade(formData: FormData): Promise<void> {
  const symbol = formatSymbol(String(formData.get("symbol")));
  const weekStart = String(formData.get("weekStart"));
  const tradeId = Number(formData.get("tradeId"));

  await prisma.trade.delete({ where: { id: tradeId } });
  revalidateTradePaths(symbol, weekStart);
}
