"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { MARKET_PATH } from "@/lib/tools-paths";
import { formatSymbol } from "@/lib/utils";
import {
  normalizeNowPollInterval,
  nowPollIntervalFromDb,
  nowPollIntervalToDb,
  type NowPollIntervalSelection,
} from "@/lib/now-polling-session";
import {
  createJournalTickerSchema,
  createTickerSchema,
  deleteTickerSchema,
  updateJournalTickerSchema,
  updateTickerSchema,
} from "@/lib/validators";
import { hasRangoOptimoInput, upsertRangoOptimoEntry } from "@/lib/rango-optimo-upsert";

export type JournalTickerRow = {
  id: number;
  symbol: string;
  name: string | null;
  notes: string | null;
  isFavorite: boolean;
  pollInterval: NowPollIntervalSelection;
  priceOptimo: number | null;
  rangoOptimoLow: number | null;
  rangoOptimoHigh: number | null;
  minPrice: number | null;
  maxPrice: number | null;
};

/** Ensures every rango_optimo symbol exists in tickers and copies nombre → name. */
export async function syncTickersFromRangoOptimo(): Promise<number> {
  const rangos = await prisma.rangoOptimo.findMany({
    select: { symbol: true, nombre: true },
    orderBy: { symbol: "asc" },
  });
  if (rangos.length === 0) return 0;

  const result = await prisma.ticker.createMany({
    data: rangos.map((row) => ({ symbol: row.symbol })),
    skipDuplicates: true,
  });

  await syncTickerNamesFromRangoOptimo(rangos);

  return result.count;
}

async function syncTickerNamesFromRangoOptimo(
  rangos: { symbol: string; nombre: string | null }[]
): Promise<void> {
  const withName = rangos.filter((r) => r.nombre?.trim());
  if (withName.length === 0) return;

  await prisma.$transaction(
    withName.map((rango) =>
      prisma.ticker.updateMany({
        where: { symbol: rango.symbol },
        data: { name: rango.nombre!.trim() },
      })
    )
  );
}

function mapJournalTickerRow(
  rango: {
    symbol: string;
    priceOptimo: { toString(): string } | null;
    rangoOptimoLow: { toString(): string } | null;
    rangoOptimoHigh: { toString(): string } | null;
    minPrice: { toString(): string } | null;
    maxPrice: { toString(): string } | null;
  },
  ticker: {
    id: number;
    symbol: string;
    name: string | null;
    notes: string | null;
    isFavorite: boolean;
    financeAiNowPollInterval: Parameters<typeof nowPollIntervalFromDb>[0];
  }
): JournalTickerRow {
  const toNum = (v: { toString(): string } | null) => {
    if (v == null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  return {
    id: ticker.id,
    symbol: rango.symbol,
    name: ticker.name,
    notes: ticker.notes,
    isFavorite: ticker.isFavorite,
    pollInterval: nowPollIntervalFromDb(ticker.financeAiNowPollInterval),
    priceOptimo: toNum(rango.priceOptimo),
    rangoOptimoLow: toNum(rango.rangoOptimoLow),
    rangoOptimoHigh: toNum(rango.rangoOptimoHigh),
    minPrice: toNum(rango.minPrice),
    maxPrice: toNum(rango.maxPrice),
  };
}

function mapJournalTickerRowFromTicker(ticker: {
  id: number;
  symbol: string;
  name: string | null;
  notes: string | null;
  isFavorite: boolean;
  financeAiNowPollInterval: Parameters<typeof nowPollIntervalFromDb>[0];
}): JournalTickerRow {
  return {
    id: ticker.id,
    symbol: ticker.symbol,
    name: ticker.name,
    notes: ticker.notes,
    isFavorite: ticker.isFavorite,
    pollInterval: nowPollIntervalFromDb(ticker.financeAiNowPollInterval),
    priceOptimo: null,
    rangoOptimoLow: null,
    rangoOptimoHigh: null,
    minPrice: null,
    maxPrice: null,
  };
}

const tickerJournalSelect = {
  id: true,
  symbol: true,
  name: true,
  notes: true,
  isFavorite: true,
  financeAiNowPollInterval: true,
} as const;

/** Journal list — rango_optimo tickers + manual tickers not in Excel. */
export async function listJournalTickers(): Promise<JournalTickerRow[]> {
  await syncTickersFromRangoOptimo();

  const rangos = await prisma.rangoOptimo.findMany({ orderBy: { symbol: "asc" } });
  const rangoSymbols = new Set(rangos.map((r) => r.symbol));

  const allTickers = await prisma.ticker.findMany({
    where: { journalExcluded: false },
    select: tickerJournalSelect,
    orderBy: { symbol: "asc" },
  });
  const bySymbol = new Map(allTickers.map((t) => [t.symbol, t]));

  const rows: JournalTickerRow[] = [];

  for (const rango of rangos) {
    const ticker = bySymbol.get(rango.symbol);
    if (!ticker) continue;
    rows.push(mapJournalTickerRow(rango, ticker));
  }

  for (const ticker of allTickers) {
    if (!rangoSymbols.has(ticker.symbol)) {
      rows.push(mapJournalTickerRowFromTicker(ticker));
    }
  }

  return rows.sort((a, b) => {
    if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
    return a.symbol.localeCompare(b.symbol);
  });
}

export async function createJournalTicker(formData: FormData): Promise<void> {
  const parsed = createJournalTickerSchema.safeParse({
    symbol: formData.get("symbol"),
    name: formData.get("name") || undefined,
    notes: formData.get("notes") || undefined,
    isFavorite: formData.get("isFavorite") ?? "0",
    pollInterval: formData.get("pollInterval") || "none",
    rangoOptimoLow: formData.get("rangoOptimoLow") || undefined,
    rangoOptimoHigh: formData.get("rangoOptimoHigh") || undefined,
    minPrice: formData.get("minPrice") || undefined,
    maxPrice: formData.get("maxPrice") || undefined,
  });

  if (!parsed.success) return;

  const symbol = formatSymbol(parsed.data.symbol);
  const isFavorite = parsed.data.isFavorite ?? false;
  const pollInterval = normalizeNowPollInterval(parsed.data.pollInterval);
  const rangoInput = {
    symbol,
    rangoOptimoLow: parsed.data.rangoOptimoLow,
    rangoOptimoHigh: parsed.data.rangoOptimoHigh,
    minPrice: parsed.data.minPrice,
    maxPrice: parsed.data.maxPrice,
  };

  const existing = await prisma.ticker.findUnique({
    where: { symbol },
    select: { id: true, journalExcluded: true },
  });
  if (existing && !existing.journalExcluded) return;

  if (existing?.journalExcluded) {
    await prisma.$transaction(async (tx) => {
      await tx.ticker.update({
        where: { id: existing.id },
        data: {
          journalExcluded: false,
          name: parsed.data.name?.trim() || null,
          notes: parsed.data.notes?.trim() || null,
          isFavorite,
          financeAiNowPollInterval: nowPollIntervalToDb(pollInterval),
        },
      });

      if (hasRangoOptimoInput(rangoInput)) {
        await upsertRangoOptimoEntry(rangoInput, tx);
      }
    });

    revalidateTickerPaths();
    revalidatePath("/config/aws");
    revalidatePath("/config");

    if (isFavorite) {
      void syncFinanceAiWatchlistAfterFavoriteChange();
    }
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.ticker.create({
      data: {
        symbol,
        name: parsed.data.name?.trim() || null,
        notes: parsed.data.notes?.trim() || null,
        isFavorite,
        financeAiNowPollInterval: nowPollIntervalToDb(pollInterval),
      },
    });

    if (hasRangoOptimoInput(rangoInput)) {
      await upsertRangoOptimoEntry(rangoInput, tx);
    }
  });

  revalidateTickerPaths();
  revalidatePath("/config/aws");
  revalidatePath("/config");

  if (isFavorite) {
    void syncFinanceAiWatchlistAfterFavoriteChange();
  }
}

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

  revalidateTickerPaths();
}

function revalidateTickerPaths() {
  revalidatePath("/config/tickers");
  revalidatePath("/tickers");
  revalidatePath("/market");
  revalidatePath(MARKET_PATH);
  revalidatePath("/");
  revalidatePath("/", "layout");
}

export async function updateTicker(formData: FormData): Promise<void> {
  const parsed = updateTickerSchema.safeParse({
    id: formData.get("id"),
    symbol: formData.get("symbol"),
    name: formData.get("name") || undefined,
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) return;

  const symbol = formatSymbol(parsed.data.symbol);
  const name = parsed.data.name?.trim() || null;
  const notes = parsed.data.notes?.trim() || null;

  const existing = await prisma.ticker.findUnique({
    where: { id: parsed.data.id },
    select: { id: true, symbol: true },
  });
  if (!existing) return;

  if (symbol !== existing.symbol) {
    const taken = await prisma.ticker.findUnique({
      where: { symbol },
      select: { id: true },
    });
    if (taken && taken.id !== existing.id) return;
  }

  await prisma.ticker.update({
    where: { id: parsed.data.id },
    data: { symbol, name, notes },
  });

  revalidateTickerPaths();
}

export async function updateJournalTicker(formData: FormData): Promise<void> {
  const parsed = updateJournalTickerSchema.safeParse({
    id: formData.get("id"),
    symbol: formData.get("symbol"),
    name: formData.get("name") || undefined,
    notes: formData.get("notes") || undefined,
    isFavorite: formData.get("isFavorite") ?? "0",
    pollInterval: formData.get("pollInterval") || undefined,
    rangoOptimoLow: formData.get("rangoOptimoLow") || undefined,
    rangoOptimoHigh: formData.get("rangoOptimoHigh") || undefined,
    minPrice: formData.get("minPrice") || undefined,
    maxPrice: formData.get("maxPrice") || undefined,
  });

  if (!parsed.success) return;

  const symbol = formatSymbol(parsed.data.symbol);
  const name = parsed.data.name?.trim() || null;
  const notes = parsed.data.notes?.trim() || null;
  const isFavorite = parsed.data.isFavorite ?? false;
  const pollInterval = normalizeNowPollInterval(parsed.data.pollInterval);
  const rangoInput = {
    symbol,
    rangoOptimoLow: parsed.data.rangoOptimoLow,
    rangoOptimoHigh: parsed.data.rangoOptimoHigh,
    minPrice: parsed.data.minPrice,
    maxPrice: parsed.data.maxPrice,
  };

  const existing = await prisma.ticker.findUnique({
    where: { id: parsed.data.id },
    select: { id: true, symbol: true, isFavorite: true },
  });
  if (!existing) return;

  if (symbol !== existing.symbol) {
    const taken = await prisma.ticker.findUnique({
      where: { symbol },
      select: { id: true },
    });
    if (taken && taken.id !== existing.id) return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.ticker.update({
      where: { id: parsed.data.id },
      data: {
        symbol,
        name,
        notes,
        isFavorite,
        financeAiNowPollInterval: nowPollIntervalToDb(pollInterval),
      },
    });

    if (hasRangoOptimoInput(rangoInput)) {
      await upsertRangoOptimoEntry(rangoInput, tx);
    }
  });

  revalidateTickerPaths();
  revalidatePath("/config/aws");
  revalidatePath("/config");

  if (isFavorite !== existing.isFavorite) {
    void syncFinanceAiWatchlistAfterFavoriteChange();
  }
}

export async function deleteTicker(formData: FormData): Promise<void> {
  const parsed = deleteTickerSchema.safeParse({
    id: formData.get("id"),
  });

  if (!parsed.success) return;

  const existing = await prisma.ticker.findUnique({
    where: { id: parsed.data.id },
    select: { id: true, symbol: true, isFavorite: true },
  });
  if (!existing) return;

  const inRango = await prisma.rangoOptimo.findUnique({
    where: { symbol: existing.symbol },
    select: { symbol: true },
  });

  if (inRango) {
    await prisma.ticker.update({
      where: { id: existing.id },
      data: {
        journalExcluded: true,
        isFavorite: false,
        mshort: false,
        financeAiNowPollInterval: null,
      },
    });

    if (existing.isFavorite) {
      void syncFinanceAiWatchlistAfterFavoriteChange();
    }
  } else {
    await prisma.ticker.delete({
      where: { id: parsed.data.id },
    });
  }

  revalidateTickerPaths();
}

export async function setTickerFavorite(formData: FormData): Promise<void> {
  const id = Number(formData.get("id"));
  const isFavorite = formData.get("isFavorite") === "1";

  if (!Number.isFinite(id)) return;

  await prisma.ticker.update({
    where: { id },
    data: { isFavorite },
  });

  revalidateTickerPaths();
  void syncFinanceAiWatchlistAfterFavoriteChange();
}

export async function toggleTickerFavorite(
  id: number,
  isFavorite: boolean
): Promise<{ success: boolean; symbol?: string; error?: string }> {
  if (!Number.isFinite(id)) {
    return { success: false, error: "Ticker inválido." };
  }

  try {
    const updated = await prisma.ticker.update({
      where: { id },
      data: { isFavorite },
      select: { symbol: true },
    });
    revalidateTickerPaths();
    void syncFinanceAiWatchlistAfterFavoriteChange();
    return { success: true, symbol: updated.symbol };
  } catch {
    return { success: false, error: "No se pudo actualizar favorito." };
  }
}

export type SetAllTickersFavoriteResult = {
  success: boolean;
  updated?: number;
  error?: string;
};

/** Mark or unmark every ticker in the journal catalog as ★ favorito. */
export async function setAllTickersFavorite(
  isFavorite: boolean
): Promise<SetAllTickersFavoriteResult> {
  try {
    const result = await prisma.ticker.updateMany({
      data: { isFavorite },
    });
    revalidateTickerPaths();
    void syncFinanceAiWatchlistAfterFavoriteChange();
    return { success: true, updated: result.count };
  } catch {
    return { success: false, error: "No se pudieron actualizar los favoritos." };
  }
}

async function syncFinanceAiWatchlistAfterFavoriteChange(): Promise<void> {
  try {
    const { syncFinanceAiWatchlistFromFavorites } = await import(
      "@/server/actions/finance-ai-schedules"
    );
    await syncFinanceAiWatchlistFromFavorites();
  } catch {
    // Best-effort — favorites saved locally even if AWS sync fails.
  }
}

export async function listFavoriteSymbols(): Promise<string[]> {
  const rows = await prisma.ticker.findMany({
    where: { isFavorite: true },
    orderBy: { symbol: "asc" },
    select: { symbol: true },
  });
  return rows.map((row) => row.symbol.toUpperCase());
}

export async function listBolinger15Symbols(): Promise<string[]> {
  const rows = await prisma.ticker.findMany({
    where: { mshort: true },
    orderBy: { symbol: "asc" },
    select: { symbol: true },
  });
  return rows.map((row) => row.symbol.toUpperCase());
}

export async function setBolinger15Tickers(symbols: string[]): Promise<void> {
  const normalized = [
    ...new Set(symbols.map((s) => formatSymbol(s)).filter(Boolean)),
  ];

  await prisma.$transaction(async (tx) => {
    await tx.ticker.updateMany({
      where: {
        mshort: true,
        ...(normalized.length > 0 ? { symbol: { notIn: normalized } } : {}),
      },
      data: { mshort: false },
    });

    for (const symbol of normalized) {
      await tx.ticker.upsert({
        where: { symbol },
        create: { symbol, mshort: true },
        update: { mshort: true },
      });
    }
  });

  revalidateTickerPaths();
  revalidatePath("/config/aws");
  revalidatePath("/config");
}

export async function listMlongSymbols(): Promise<string[]> {
  const rows = await prisma.ticker.findMany({
    where: { mlong: true },
    orderBy: { symbol: "asc" },
    select: { symbol: true },
  });
  return rows.map((row) => row.symbol.toUpperCase());
}

export async function setMlongTickers(symbols: string[]): Promise<void> {
  const normalized = [
    ...new Set(symbols.map((s) => formatSymbol(s)).filter(Boolean)),
  ];

  await prisma.$transaction(async (tx) => {
    await tx.ticker.updateMany({
      where: {
        mlong: true,
        ...(normalized.length > 0 ? { symbol: { notIn: normalized } } : {}),
      },
      data: { mlong: false },
    });

    for (const symbol of normalized) {
      await tx.ticker.upsert({
        where: { symbol },
        create: { symbol, mlong: true },
        update: { mlong: true },
      });
    }
  });

  revalidateTickerPaths();
}

/** Tickers with mlong=true for Market Result Now evaluation scope. */
export async function listMlongTickersForMarket() {
  return prisma.ticker.findMany({
    where: { mlong: true },
    orderBy: { symbol: "asc" },
    select: { symbol: true, name: true },
  });
}

export async function saveMlongTickers(
  symbols: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    await setMlongTickers(symbols);
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "No se pudo guardar Movimientos Long.",
    };
  }
}

export async function listTickers() {
  return prisma.ticker.findMany({
    orderBy: [{ isFavorite: "desc" }, { symbol: "asc" }],
    select: {
      id: true,
      symbol: true,
      name: true,
      notes: true,
      isFavorite: true,
    },
  });
}

/** Symbols for FinanceAI calendar refresh — all tickers in Config table. */
export async function listCalendarRefreshSymbols(): Promise<string[]> {
  const tickers = await listTickers();
  return [...new Set(tickers.map((t) => t.symbol.toUpperCase()))];
}

export type TickerFinanceAiPersisted = {
  status: string | null;
  syncedAt: string | null;
  lastBarAt: string | null;
  error: string | null;
};

const gestionTickerSelect = {
  id: true,
  symbol: true,
  name: true,
  financeAiStatus: true,
  financeAiSyncedAt: true,
  financeAiLastBarAt: true,
  financeAiError: true,
  financeAiPremarketAt: true,
  financeAiPremarketMode: true,
  financeAiPremarketBias: true,
  financeAiPremarketRevision: true,
  financeAiPremarketDate: true,
  financeAiLiveEligible: true,
  financeAiPremarketGapEntry: true,
  financeAiNowPollInterval: true,
  financeAiNowLastPollAt: true,
} as const;

/** Favoritos con estado FinanceAI persistido (init, pre-market, pool en vivo). */
export async function listTickersForGestion() {
  return prisma.ticker.findMany({
    where: { isFavorite: true },
    orderBy: { symbol: "asc" },
    select: gestionTickerSelect,
  });
}

/** Todos los tickers para Ticker Context — ★ favoritos primero. */
export async function listTickersForTickerContext() {
  return prisma.ticker.findMany({
    orderBy: [{ isFavorite: "desc" }, { symbol: "asc" }],
    select: {
      ...gestionTickerSelect,
      isFavorite: true,
    },
  });
}

export async function setTickerFinanceAiLiveEligible(
  symbol: string,
  enabled: boolean
): Promise<void> {
  const sym = formatSymbol(symbol);
  await prisma.ticker.update({
    where: { symbol: sym },
    data: { financeAiLiveEligible: enabled },
  });
  revalidatePath(MARKET_PATH);
}

/** Stop live Watch on all tickers (end of session or manual). */
export async function clearAllTickerLiveWatching(): Promise<number> {
  const result = await prisma.ticker.updateMany({
    where: { financeAiLiveEligible: true },
    data: { financeAiLiveEligible: false },
  });
  revalidatePath(MARKET_PATH);
  return result.count;
}

/** Mirror Dynamo TickersToday15M → MySQL BB15 movement pool. */
export async function persistTickersToday15mPool(
  symbols: string[],
  tradeDate: string
): Promise<{ updated: number }> {
  const scope = [...new Set(symbols.map((s) => formatSymbol(s)).filter(Boolean))];
  await prisma.ticker.updateMany({
    where: { financeAiBb15Pool: true },
    data: { financeAiBb15Pool: false },
  });
  if (scope.length === 0) {
    revalidatePath(MARKET_PATH);
    revalidatePath(MARKET_PATH);
    return { updated: 0 };
  }
  const result = await prisma.ticker.updateMany({
    where: { symbol: { in: scope } },
    data: { financeAiBb15Pool: true },
  });
  revalidatePath(MARKET_PATH);
  revalidatePath(MARKET_PATH);
  return { updated: result.count };
}

/** Mirror Dynamo TickersToday → MySQL live pool (PRE/NOW/POST scope only). */
export async function persistTickersTodayPool(
  symbols: string[],
  tradeDate: string
): Promise<{ updated: number }> {
  const scope = [...new Set(symbols.map((s) => formatSymbol(s)).filter(Boolean))];
  await prisma.ticker.updateMany({
    where: { financeAiLiveEligible: true },
    data: { financeAiLiveEligible: false },
  });
  if (scope.length === 0) {
    revalidatePath(MARKET_PATH);
    return { updated: 0 };
  }
  const result = await prisma.ticker.updateMany({
    where: { symbol: { in: scope } },
    data: { financeAiLiveEligible: true },
  });
  revalidatePath(MARKET_PATH);
  return { updated: result.count };
}

export async function persistTickerFinanceAiPremarket(
  symbol: string,
  data: {
    mode: string;
    bias?: string | null;
    revision?: number | null;
    tradeDate?: string | null;
    gapEntry?: boolean;
  }
): Promise<void> {
  const sym = formatSymbol(symbol);
  await prisma.ticker.update({
    where: { symbol: sym },
    data: {
      financeAiPremarketAt: new Date(),
      financeAiPremarketMode: data.mode,
      financeAiPremarketBias: data.bias ?? null,
      financeAiPremarketRevision: data.revision ?? null,
      financeAiPremarketDate: data.tradeDate ?? null,
      financeAiPremarketGapEntry: data.gapEntry ?? false,
    },
  });
}

export async function persistTickerFinanceAiState(
  symbol: string,
  data: {
    status: string;
    error?: string | null;
    lastBarAt?: string | null;
  }
): Promise<void> {
  const sym = formatSymbol(symbol);
  await prisma.ticker.update({
    where: { symbol: sym },
    data: {
      financeAiStatus: data.status,
      financeAiSyncedAt: new Date(),
      financeAiLastBarAt: data.lastBarAt ?? null,
      financeAiError: data.error ?? null,
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
