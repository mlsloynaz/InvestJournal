"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { formatSymbol } from "@/lib/utils";
import { createTickerSchema } from "@/lib/validators";

export async function createTicker(formData: FormData): Promise<void> {
  const parsed = createTickerSchema.safeParse({
    symbol: formData.get("symbol"),
    name: formData.get("name") || undefined,
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) return;

  const symbol = formatSymbol(parsed.data.symbol);

  await prisma.ticker.upsert({
    where: { symbol },
    create: {
      symbol,
      name: parsed.data.name || null,
      notes: parsed.data.notes || null,
    },
    update: {
      name: parsed.data.name || null,
      notes: parsed.data.notes || null,
    },
  });

  revalidatePath("/config/tickers");
  revalidatePath("/tickers");
  revalidatePath("/");
  revalidatePath("/", "layout");
}

export async function setTickerFavorite(formData: FormData): Promise<void> {
  const id = Number(formData.get("id"));
  const isFavorite = formData.get("isFavorite") === "1";

  if (!Number.isFinite(id)) return;

  await prisma.ticker.update({
    where: { id },
    data: { isFavorite },
  });

  revalidatePath("/config/tickers");
  revalidatePath("/");
  revalidatePath("/", "layout");
}

export async function listTickers() {
  return prisma.ticker.findMany({
    orderBy: [{ isFavorite: "desc" }, { symbol: "asc" }],
    select: {
      id: true,
      symbol: true,
      name: true,
      isFavorite: true,
    },
  });
}

export async function getTickerBySymbol(symbol: string) {
  return prisma.ticker.findUnique({
    where: { symbol: formatSymbol(symbol) },
    include: {
      _count: {
        select: { tickerWeeks: true, analysisEntries: true, earningsEvents: true },
      },
    },
  });
}
