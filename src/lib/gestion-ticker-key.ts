/** Stable string key for ticker list + FinanceAI status (avoids effect loops on array identity). */
export function gestionTickerStatusKey(
  tickers: { symbol: string; financeAi?: { status?: string | null } }[]
): string {
  return tickers.map((t) => `${t.symbol}:${t.financeAi?.status ?? ""}`).join("|");
}

export function gestionReadySymbols(
  tickers: { symbol: string; financeAi?: { status?: string | null } }[]
): string[] {
  return tickers.filter((t) => t.financeAi?.status === "ready").map((t) => t.symbol);
}

/** All ★ favorites on the Gestión page (listTickersForGestion). */
export function gestionFavoriteSymbols(
  tickers: { symbol: string }[]
): string[] {
  return tickers.map((t) => t.symbol);
}
