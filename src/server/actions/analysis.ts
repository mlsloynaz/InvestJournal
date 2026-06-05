"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { analysisEntrySchema } from "@/lib/validators";

export async function addAnalysisEntry(formData: FormData): Promise<void> {
  const parsed = analysisEntrySchema.safeParse({
    tickerId: formData.get("tickerId"),
    entryDate: formData.get("entryDate"),
    type: formData.get("type"),
    body: formData.get("body"),
    tickerWeekId: formData.get("tickerWeekId") || undefined,
  });

  if (!parsed.success) {
    return;
  }

  const entry = await prisma.analysisEntry.create({
    data: {
      tickerId: parsed.data.tickerId,
      entryDate: new Date(parsed.data.entryDate + "T00:00:00.000Z"),
      type: parsed.data.type,
      body: parsed.data.body,
      tickerWeekId: parsed.data.tickerWeekId ?? null,
    },
    include: { ticker: true },
  });

  const symbol = entry.ticker.symbol;
  revalidatePath(`/tickers/${symbol}/analysis`);
  revalidatePath(`/tickers/${symbol}`);
  revalidatePath("/");
}

export async function getAnalysisTimeline(tickerId: number, from?: string, to?: string) {
  const where: {
    tickerId: number;
    entryDate?: { gte?: Date; lte?: Date };
  } = { tickerId };

  if (from || to) {
    where.entryDate = {};
    if (from) where.entryDate.gte = new Date(from + "T00:00:00.000Z");
    if (to) where.entryDate.lte = new Date(to + "T00:00:00.000Z");
  }

  const entries = await prisma.analysisEntry.findMany({
    where,
    orderBy: [{ entryDate: "desc" }, { entryAt: "desc" }, { id: "desc" }],
  });

  const grouped = new Map<string, typeof entries>();
  for (const entry of entries) {
    const key = entry.entryDate.toISOString().slice(0, 10);
    const list = grouped.get(key) ?? [];
    list.push(entry);
    grouped.set(key, list);
  }

  return Array.from(grouped.entries()).map(([date, items]) => ({
    date,
    items: items.sort(
      (a, b) => a.entryAt.getTime() - b.entryAt.getTime() || a.id - b.id
    ),
  }));
}

export async function getAnalysisStats(tickerId: number) {
  const counts = await prisma.analysisEntry.groupBy({
    by: ["type"],
    where: { tickerId },
    _count: { _all: true },
  });
  return counts;
}
