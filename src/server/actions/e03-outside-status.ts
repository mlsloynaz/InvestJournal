"use server";

import type { FinanceAiPremarketAnalysis } from "@/lib/finance-ai-types";
import {
  buildE03OutsideTickerRow,
  type E03OutsideTickerRow,
} from "@/lib/e03-outside-display";
import {
  checkFinanceAiTicker,
} from "@/server/actions/finance-ai";
import {
  loadPersistedE03OutsideBatch,
  persistE03OutsideBatch,
} from "@/server/actions/e03-outside-snapshot";
import { isFinanceAiConfigured } from "@/server/services/finance-ai-client";

const BATCH_SIZE = 6;

async function loadOneE03SymbolFresh(symbol: string): Promise<E03OutsideTickerRow> {
  const sym = symbol.trim().toUpperCase();
  if (!sym) {
    return buildE03OutsideTickerRow(sym, undefined, "Símbolo vacío");
  }

  const checked = await checkFinanceAiTicker(sym);
  if (checked.success && checked.analysis) {
    return buildE03OutsideTickerRow(sym, checked.analysis);
  }
  return buildE03OutsideTickerRow(sym, checked.analysis, checked.error);
}

function filterRowsForSymbols(
  rows: E03OutsideTickerRow[],
  symbols: string[]
): E03OutsideTickerRow[] {
  const allow = new Set(symbols.map((s) => s.trim().toUpperCase()));
  return rows.filter((row) => allow.has(row.symbol.trim().toUpperCase()));
}

export async function loadE03OutsideBatch(params: {
  symbols: string[];
  fresh?: boolean;
}): Promise<{
  success: boolean;
  rows: E03OutsideTickerRow[];
  error?: string;
  persistedAt?: string;
  fromSnapshot?: boolean;
}> {
  const symbols = [...new Set(params.symbols.map((s) => s.trim().toUpperCase()).filter(Boolean))];
  if (symbols.length === 0) {
    return { success: false, rows: [], error: "Sin tickers Movimiento 15M en config." };
  }

  if (params.fresh !== true) {
    const stored = await loadPersistedE03OutsideBatch();
    if (!stored.success) {
      return { success: false, rows: [], error: stored.error };
    }
    const rows = filterRowsForSymbols(stored.rows ?? [], symbols);
    if (rows.length === 0) {
      return {
        success: false,
        rows: [],
        error: "Sin evaluación E03 guardada — pulsa Evaluate",
      };
    }
    return {
      success: true,
      rows,
      persistedAt: stored.persistedAt,
      fromSnapshot: true,
    };
  }

  if (!isFinanceAiConfigured()) {
    return { success: false, rows: [], error: "FinanceAI no configurado" };
  }

  const rows: E03OutsideTickerRow[] = [];
  for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
    const chunk = symbols.slice(i, i + BATCH_SIZE);
    const chunkRows = await Promise.all(chunk.map((sym) => loadOneE03SymbolFresh(sym)));
    rows.push(...chunkRows);
  }

  await persistE03OutsideBatch(rows);

  return { success: true, rows };
}
