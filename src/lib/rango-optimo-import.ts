import * as XLSX from "xlsx";

export const RANGO_OPTIMO_LAST_DATE_KEY = "rango_optimo_last_date";

export type ParsedRangoOptimoRow = {
  symbol: string;
  nombre: string | null;
  rangoOptimoLow: number | null;
  rangoOptimoHigh: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  priceOptimo: number | null;
};

export function parseDollarRange(text: unknown): { low: number | null; high: number | null } {
  const raw = String(text ?? "").trim();
  if (!raw) return { low: null, high: null };
  const nums = raw.match(/\d+(?:\.\d+)?/g);
  if (!nums || nums.length < 2) return { low: null, high: null };
  return { low: Number(nums[0]), high: Number(nums[1]) };
}

export function parseMinMax(text: unknown): { min: number | null; max: number | null } {
  const raw = String(text ?? "").trim();
  if (!raw) return { min: null, max: null };
  const minMatch = raw.match(/MIN\s*\$?\s*(\d+(?:\.\d+)?)/i);
  const maxMatch = raw.match(/MAX\s*\$?\s*(\d+(?:\.\d+)?)/i);
  return {
    min: minMatch ? Number(minMatch[1]) : null,
    max: maxMatch ? Number(maxMatch[1]) : null,
  };
}

export function midpoint(low: number | null, high: number | null): number | null {
  if (low == null || high == null) return null;
  return Math.round(((low + high) / 2) * 100) / 100;
}

export function parseDateFromFilename(filename: string): string | null {
  const match = filename.match(/(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

function pickColumn(row: Record<string, unknown>, ...labels: string[]): unknown {
  const entries = Object.entries(row);
  for (const label of labels) {
    const wanted = normalizeHeader(label);
    const hit = entries.find(([key]) => normalizeHeader(key) === wanted);
    if (hit) return hit[1];
  }
  return undefined;
}

export function parseRangoOptimoWorkbook(
  buffer: Buffer,
  filename: string
): { rows: ParsedRangoOptimoRow[]; analysisDate: string | null } {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return { rows: [], analysisDate: parseDateFromFilename(filename) };
  }

  const sheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  const rows: ParsedRangoOptimoRow[] = [];

  for (const raw of rawRows) {
    const symbol = String(pickColumn(raw, "TICKER") ?? "")
      .trim()
      .toUpperCase();
    if (!symbol) continue;

    const rango = parseDollarRange(pickColumn(raw, "RANGO ÓPTIMO", "RANGO OPTIMO"));
    const minMax = parseMinMax(pickColumn(raw, "MÍNIMO Y MÁXIMO", "MINIMO Y MAXIMO"));
    const priceOptimo = midpoint(rango.low, rango.high);
    const nombreRaw = String(pickColumn(raw, "NOMBRE", "NAME") ?? "").trim().slice(0, 128);

    rows.push({
      symbol,
      nombre: nombreRaw || null,
      rangoOptimoLow: rango.low,
      rangoOptimoHigh: rango.high,
      minPrice: minMax.min,
      maxPrice: minMax.max,
      priceOptimo,
    });
  }

  return {
    rows,
    analysisDate: parseDateFromFilename(filename),
  };
}
