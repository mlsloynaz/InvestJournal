import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import * as XLSX from "xlsx";

const RANGO_OPTIMO_LAST_DATE_KEY = "rango_optimo_last_date";

function parseDollarRange(text) {
  const raw = String(text ?? "").trim();
  const nums = raw.match(/\d+(?:\.\d+)?/g);
  if (!nums || nums.length < 2) return { low: null, high: null };
  return { low: Number(nums[0]), high: Number(nums[1]) };
}

function parseMinMax(text) {
  const raw = String(text ?? "").trim();
  const minMatch = raw.match(/MIN\s*\$?\s*(\d+(?:\.\d+)?)/i);
  const maxMatch = raw.match(/MAX\s*\$?\s*(\d+(?:\.\d+)?)/i);
  return {
    min: minMatch ? Number(minMatch[1]) : null,
    max: maxMatch ? Number(maxMatch[1]) : null,
  };
}

function midpoint(low, high) {
  if (low == null || high == null) return null;
  return Math.round(((low + high) / 2) * 100) / 100;
}

function parseDateFromFilename(filename) {
  const match = filename.match(/(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

function normalizeHeader(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

function pickColumn(row, ...labels) {
  for (const label of labels) {
    const wanted = normalizeHeader(label);
    const hit = Object.entries(row).find(([key]) => normalizeHeader(key) === wanted);
    if (hit) return hit[1];
  }
  return undefined;
}

function parseWorkbook(buffer, filename) {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  const rows = [];

  for (const raw of rawRows) {
    const symbol = String(pickColumn(raw, "TICKER") ?? "")
      .trim()
      .toUpperCase();
    if (!symbol) continue;
    const rango = parseDollarRange(pickColumn(raw, "RANGO ÓPTIMO", "RANGO OPTIMO"));
    const minMax = parseMinMax(pickColumn(raw, "MÍNIMO Y MÁXIMO", "MINIMO Y MAXIMO"));
    const nombreRaw = String(pickColumn(raw, "NOMBRE", "NAME") ?? "").trim().slice(0, 128);
    rows.push({
      symbol,
      nombre: nombreRaw || null,
      rangoOptimoLow: rango.low,
      rangoOptimoHigh: rango.high,
      minPrice: minMax.min,
      maxPrice: minMax.max,
      priceOptimo: midpoint(rango.low, rango.high),
    });
  }

  return { rows, analysisDate: parseDateFromFilename(filename) };
}

const filePath =
  process.argv[2] ??
  "C:/Users/malu.loynaz/Downloads/rango_precios_opciones_2026-05-20.xlsx";

const prisma = new PrismaClient();

async function main() {
  const buffer = readFileSync(filePath);
  const filename = filePath.split(/[\\/]/).pop() ?? filePath;
  const { rows, analysisDate } = parseWorkbook(buffer, filename);

  if (!analysisDate) throw new Error("Filename must include YYYY-MM-DD");
  if (rows.length === 0) throw new Error("No rows parsed");

  const symbols = rows.map((r) => r.symbol);
  const nombreBySymbol = new Map(rows.map((r) => [r.symbol, r.nombre]));

  let tickersUpdated = 0;

  await prisma.$transaction(async (tx) => {
    await tx.rangoOptimo.deleteMany({ where: { symbol: { notIn: symbols } } });
    for (const row of rows) {
      await tx.rangoOptimo.upsert({
        where: { symbol: row.symbol },
        create: row,
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
        const updated = await tx.ticker.updateMany({
          where: { symbol: row.symbol },
          data: { name: row.nombre },
        });
        tickersUpdated += updated.count;
      }
    }

    const existing = await tx.ticker.findMany({
      where: { symbol: { in: symbols } },
      select: { symbol: true },
    });
    const existingSet = new Set(existing.map((t) => t.symbol));
    const missing = symbols.filter((symbol) => !existingSet.has(symbol));
    if (missing.length > 0) {
      await tx.ticker.createMany({
        data: missing.map((symbol) => ({
          symbol,
          name: nombreBySymbol.get(symbol) ?? null,
        })),
        skipDuplicates: true,
      });
    }

    await tx.generalSetting.upsert({
      where: { key: RANGO_OPTIMO_LAST_DATE_KEY },
      create: { key: RANGO_OPTIMO_LAST_DATE_KEY, value: analysisDate },
      update: { value: analysisDate },
    });
  });

  const withNombre = rows.filter((r) => r.nombre).length;
  console.log(
    `Imported ${rows.length} tickers · ${withNombre} with nombre · date ${analysisDate} · ${tickersUpdated} ticker names updated`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
