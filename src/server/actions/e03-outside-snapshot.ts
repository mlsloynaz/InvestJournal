"use server";

import { prisma } from "@/lib/db";
import type { E03OutsideTickerRow } from "@/lib/e03-outside-display";

const SNAPSHOT_ROW_ID = 1;

function parseRowsJson(raw: string): E03OutsideTickerRow[] | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed as E03OutsideTickerRow[];
  } catch {
    return null;
  }
}

function resolveTradeDate(rows: E03OutsideTickerRow[]): string | null {
  for (const row of rows) {
    const date =
      row.analysis?.date?.trim() ||
      row.analysis?.simulationTradeDate?.trim();
    if (date) return date;
  }
  return null;
}

export async function loadPersistedE03OutsideBatch(): Promise<{
  success: boolean;
  rows?: E03OutsideTickerRow[];
  persistedAt?: string;
  tradeDate?: string | null;
  error?: string;
}> {
  try {
    const row = await prisma.e03OutsideSnapshot.findUnique({
      where: { id: SNAPSHOT_ROW_ID },
    });
    if (!row) {
      return { success: true, rows: [] };
    }
    const rows = parseRowsJson(row.rowsJson);
    if (!rows) {
      return { success: false, error: "Snapshot E03 invalido en MySQL" };
    }
    return {
      success: true,
      rows,
      persistedAt: row.updatedAt.toISOString(),
      tradeDate: row.tradeDate,
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "No se pudo leer snapshot E03",
    };
  }
}

export async function persistE03OutsideBatch(
  rows: E03OutsideTickerRow[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const rowsJson = JSON.stringify(rows);
    const tradeDate = resolveTradeDate(rows);

    await prisma.e03OutsideSnapshot.upsert({
      where: { id: SNAPSHOT_ROW_ID },
      create: {
        id: SNAPSHOT_ROW_ID,
        tradeDate,
        rowsJson,
      },
      update: {
        tradeDate,
        rowsJson,
      },
    });

    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "No se pudo guardar snapshot E03",
    };
  }
}
