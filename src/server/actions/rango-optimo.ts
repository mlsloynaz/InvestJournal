"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { calc35, calcRisk } from "@/lib/price-calc";
import {
  parseRangoOptimoWorkbook,
  RANGO_OPTIMO_LAST_DATE_KEY,
} from "@/lib/rango-optimo-import";
import { formatSymbol } from "@/lib/utils";

export type RangoOptimoLookupResult = {
  success: boolean;
  error?: string;
  symbol?: string;
  priceOptimo?: number | null;
  rangoOptimoLow?: number | null;
  rangoOptimoHigh?: number | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  rangeLow?: number | null;
  rangeHigh?: number | null;
};

export type RangoOptimoEntry = {
  symbol: string;
  priceOptimo: number | null;
  rangoOptimoLow: number | null;
  rangoOptimoHigh: number | null;
  minPrice: number | null;
  maxPrice: number | null;
};

export type ImportRangoOptimoResult = {
  success: boolean;
  error?: string;
  imported?: number;
  tickersAdded?: number;
  analysisDate?: string | null;
};

function toNumber(value: { toString(): string } | null | undefined): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function mapRow(row: {
  symbol: string;
  priceOptimo: { toString(): string } | null;
  rangoOptimoLow: { toString(): string } | null;
  rangoOptimoHigh: { toString(): string } | null;
  minPrice: { toString(): string } | null;
  maxPrice: { toString(): string } | null;
}): RangoOptimoEntry {
  return {
    symbol: row.symbol,
    priceOptimo: toNumber(row.priceOptimo),
    rangoOptimoLow: toNumber(row.rangoOptimoLow),
    rangoOptimoHigh: toNumber(row.rangoOptimoHigh),
    minPrice: toNumber(row.minPrice),
    maxPrice: toNumber(row.maxPrice),
  };
}

export async function getRangoOptimoLastDate(): Promise<string | null> {
  const row = await prisma.generalSetting.findUnique({
    where: { key: RANGO_OPTIMO_LAST_DATE_KEY },
  });
  return row?.value ?? null;
}

export async function listRangoOptimoEntries(): Promise<RangoOptimoEntry[]> {
  const rows = await prisma.rangoOptimo.findMany({
    orderBy: { symbol: "asc" },
  });
  return rows.map(mapRow);
}

export async function lookupRangoOptimo(symbol: string): Promise<RangoOptimoLookupResult> {
  const normalized = formatSymbol(symbol);
  if (!normalized) {
    return { success: false, error: "Ingresa un ticker válido." };
  }

  const row = await prisma.rangoOptimo.findUnique({
    where: { symbol: normalized },
  });

  if (!row) {
    return { success: false, error: `Sin rango óptimo para ${normalized}.` };
  }

  const entry = mapRow(row);
  const priceOptimo = entry.priceOptimo;
  const rangeLow =
    entry.rangoOptimoLow ?? (priceOptimo != null ? calcRisk(priceOptimo) : null);
  const rangeHigh =
    entry.rangoOptimoHigh ?? (priceOptimo != null ? calc35(priceOptimo) : null);

  return {
    success: true,
    symbol: row.symbol,
    priceOptimo,
    rangoOptimoLow: entry.rangoOptimoLow,
    rangoOptimoHigh: entry.rangoOptimoHigh,
    minPrice: entry.minPrice,
    maxPrice: entry.maxPrice,
    rangeLow,
    rangeHigh,
  };
}

export async function importRangoOptimoFromXlsx(
  formData: FormData
): Promise<ImportRangoOptimoResult> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: "Selecciona un archivo .xlsx." };
  }

  const lower = file.name.toLowerCase();
  if (!lower.endsWith(".xlsx") && !lower.endsWith(".xls")) {
    return { success: false, error: "Solo archivos Excel (.xlsx / .xls)." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const { rows, analysisDate } = parseRangoOptimoWorkbook(buffer, file.name);

  if (rows.length === 0) {
    return { success: false, error: "No se encontraron filas con columna TICKER." };
  }

  if (!analysisDate) {
    return {
      success: false,
      error: "El nombre del archivo debe incluir la fecha (YYYY-MM-DD).",
    };
  }

  const symbols = [...new Set(rows.map((r) => formatSymbol(r.symbol)).filter(Boolean))];
  const nombreBySymbol = new Map(
    rows
      .map((r) => [formatSymbol(r.symbol), r.nombre?.trim() || null] as const)
      .filter(([symbol]) => Boolean(symbol))
  );
  let tickersAdded = 0;

  await prisma.$transaction(async (tx) => {
    await tx.rangoOptimo.deleteMany({
      where: { symbol: { notIn: symbols } },
    });

    for (const row of rows) {
      const symbol = formatSymbol(row.symbol);
      if (!symbol) continue;

      await tx.rangoOptimo.upsert({
        where: { symbol },
        create: {
          symbol,
          nombre: row.nombre,
          rangoOptimoLow: row.rangoOptimoLow,
          rangoOptimoHigh: row.rangoOptimoHigh,
          minPrice: row.minPrice,
          maxPrice: row.maxPrice,
          priceOptimo: row.priceOptimo,
        },
        update: {
          nombre: row.nombre,
          rangoOptimoLow: row.rangoOptimoLow,
          rangoOptimoHigh: row.rangoOptimoHigh,
          minPrice: row.minPrice,
          maxPrice: row.maxPrice,
          priceOptimo: row.priceOptimo,
        },
      });

      if (row.nombre) {
        await tx.ticker.updateMany({
          where: { symbol },
          data: { name: row.nombre },
        });
      }
    }

    await tx.generalSetting.upsert({
      where: { key: RANGO_OPTIMO_LAST_DATE_KEY },
      create: { key: RANGO_OPTIMO_LAST_DATE_KEY, value: analysisDate },
      update: { value: analysisDate },
    });

    const existing = await tx.ticker.findMany({
      where: { symbol: { in: symbols } },
      select: { symbol: true },
    });
    const existingSet = new Set(existing.map((t) => t.symbol));
    const missing = symbols.filter((symbol) => !existingSet.has(symbol));

    if (missing.length > 0) {
      const created = await tx.ticker.createMany({
        data: missing.map((symbol) => ({
          symbol,
          name: nombreBySymbol.get(symbol) ?? null,
        })),
        skipDuplicates: true,
      });
      tickersAdded = created.count;
    }
  });

  revalidatePath("/config");
  revalidatePath("/config/aws");
  revalidatePath("/config/tickers");
  revalidatePath("/market");
  return { success: true, imported: symbols.length, tickersAdded, analysisDate };
}
