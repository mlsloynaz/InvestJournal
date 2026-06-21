import type { FinanceAiPremarketAnalysis } from "@/lib/finance-ai-types";

/** Pre-market analysis flags gap-at-open strategies (first 5 min). */
export function detectPremarketGapEntry(analysis: FinanceAiPremarketAnalysis): boolean {
  if (analysis.tradePlan?.gapFirst5Min) return true;
  return Boolean(analysis.strategyCandidates?.some((s) => s.gapFirst5Min));
}

export function gapWatchSuppressKey(symbol: string, tradeDate: string): string {
  return `gapWatchOff:${symbol.toUpperCase()}:${tradeDate}`;
}

export function isGapWatchSuppressed(symbol: string, tradeDate: string): boolean {
  if (typeof sessionStorage === "undefined") return false;
  return sessionStorage.getItem(gapWatchSuppressKey(symbol, tradeDate)) === "1";
}

export function suppressGapAutoWatch(symbol: string, tradeDate: string): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(gapWatchSuppressKey(symbol, tradeDate), "1");
}
