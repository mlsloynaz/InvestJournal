"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { US_EQUITY_HOLIDAYS } from "@/data/us-equity-holidays";
import {
  mergeNoTradingDayRows,
  parseTradeDateIso,
  sortNoTradingDays,
  type NoTradingDayRow,
} from "@/lib/no-trading-days";
import {
  isFinanceAiConfigured,
  putScheduleSettings,
  type FinanceAiNoTradingDayEntry,
} from "@/server/services/finance-ai-client";

function mapRow(row: {
  tradeDate: Date;
  label: string | null;
  source: string | null;
}): NoTradingDayRow {
  const date = row.tradeDate.toISOString().slice(0, 10);
  return {
    date,
    label: row.label,
    source: row.source,
  };
}

function toAwsPayload(rows: NoTradingDayRow[]): FinanceAiNoTradingDayEntry[] {
  return rows.map((row) => ({
    date: row.date,
    label: row.label,
  }));
}

export async function syncNoTradingDaysToAws(
  rows: NoTradingDayRow[]
): Promise<{ success: boolean; error?: string; count?: number }> {
  if (!isFinanceAiConfigured()) {
    return { success: false, error: "FinanceAI no configurado." };
  }
  const payload = toAwsPayload(rows);
  const result = await putScheduleSettings({
    noTradingDays: payload,
    noTradingDaysSource: "investjournal",
  });
  if (!result.ok) {
    return { success: false, error: result.error };
  }
  revalidatePath("/config/aws");
  return { success: true, count: payload.length };
}

export async function listNoTradingDays(): Promise<NoTradingDayRow[]> {
  const rows = await prisma.noTradingDay.findMany({
    orderBy: { tradeDate: "asc" },
  });
  return rows.map(mapRow);
}

export async function saveNoTradingDays(
  rows: { date: string; label?: string | null; source?: string | null }[],
  options?: { syncAws?: boolean }
): Promise<{
  success: boolean;
  rows?: NoTradingDayRow[];
  error?: string;
  awsSynced?: boolean;
  awsError?: string;
}> {
  const normalized: NoTradingDayRow[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    const date = parseTradeDateIso(row.date);
    if (!date) {
      return { success: false, error: `Fecha invalida: ${row.date}` };
    }
    if (seen.has(date)) continue;
    seen.add(date);
    normalized.push({
      date,
      label: row.label?.trim() || null,
      source: row.source?.trim() || "manual",
    });
  }

  const sorted = sortNoTradingDays(normalized);

  try {
    await prisma.$transaction(async (tx) => {
      await tx.noTradingDay.deleteMany({});
      if (sorted.length > 0) {
        await tx.noTradingDay.createMany({
          data: sorted.map((row) => ({
            tradeDate: new Date(`${row.date}T12:00:00.000Z`),
            label: row.label,
            source: row.source,
          })),
        });
      }
    });
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "No se pudo guardar en MySQL",
    };
  }

  revalidatePath("/config/aws");

  const shouldSyncAws = options?.syncAws !== false;
  if (!shouldSyncAws || !isFinanceAiConfigured()) {
    return { success: true, rows: sorted, awsSynced: false };
  }

  const aws = await syncNoTradingDaysToAws(sorted);
  if (!aws.success) {
    return {
      success: true,
      rows: sorted,
      awsSynced: false,
      awsError: aws.error ?? "No se pudo publicar en AWS",
    };
  }

  return { success: true, rows: sorted, awsSynced: true };
}

export async function getDefaultUsEquityHolidays(): Promise<NoTradingDayRow[]> {
  return US_EQUITY_HOLIDAYS.map((h) => ({
    date: h.date,
    label: h.label,
    source: "default",
  }));
}

export async function mergeDefaultUsEquityHolidays(
  existing: NoTradingDayRow[]
): Promise<{
  success: boolean;
  rows?: NoTradingDayRow[];
  error?: string;
  awsSynced?: boolean;
  awsError?: string;
}> {
  const defaults = await getDefaultUsEquityHolidays();
  const merged = mergeNoTradingDayRows(existing, defaults);
  return saveNoTradingDays(merged);
}

export async function publishNoTradingDaysToAws(): Promise<{
  success: boolean;
  count?: number;
  error?: string;
}> {
  const rows = await listNoTradingDays();
  return syncNoTradingDaysToAws(rows);
}
