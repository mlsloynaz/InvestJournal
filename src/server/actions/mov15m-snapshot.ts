"use server";

import { prisma } from "@/lib/db";
import type { FinanceAiBolinger15FastMovementStatus } from "@/lib/finance-ai-types";

const SNAPSHOT_ROW_ID = 1;

function parseStatusJson(raw: string): FinanceAiBolinger15FastMovementStatus | null {
  try {
    const parsed = JSON.parse(raw) as FinanceAiBolinger15FastMovementStatus;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

function resolveLastRunAt(status: FinanceAiBolinger15FastMovementStatus): Date | null {
  const raw = status.lastRunAt?.trim();
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function loadPersistedMov15mStatus(): Promise<{
  success: boolean;
  status?: FinanceAiBolinger15FastMovementStatus;
  persistedAt?: string;
  error?: string;
}> {
  try {
    const row = await prisma.bb15ChangeTrendSnapshot.findUnique({
      where: { id: SNAPSHOT_ROW_ID },
    });
    if (!row) {
      return { success: true };
    }
    const status = parseStatusJson(row.statusJson);
    if (!status) {
      return { success: false, error: "Snapshot BB15 inválido en MySQL" };
    }
    return {
      success: true,
      status,
      persistedAt: row.updatedAt.toISOString(),
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "No se pudo leer snapshot BB15",
    };
  }
}

export async function persistMov15mStatus(
  status: FinanceAiBolinger15FastMovementStatus
): Promise<{ success: boolean; error?: string }> {
  try {
    const tradeDate =
      status.effectiveTradeDate?.trim() ||
      status.tradeDate?.trim() ||
      status.calendarDate?.trim() ||
      null;
    const lastRunPhase = status.lastRunPhase?.trim() || status.phase?.trim() || null;
    const statusJson = JSON.stringify(status);

    await prisma.bb15ChangeTrendSnapshot.upsert({
      where: { id: SNAPSHOT_ROW_ID },
      create: {
        id: SNAPSHOT_ROW_ID,
        tradeDate,
        lastRunAt: resolveLastRunAt(status),
        lastRunPhase,
        statusJson,
      },
      update: {
        tradeDate,
        lastRunAt: resolveLastRunAt(status),
        lastRunPhase,
        statusJson,
      },
    });

    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "No se pudo guardar snapshot BB15",
    };
  }
}
