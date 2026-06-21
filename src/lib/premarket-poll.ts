import type { FinanceAiPremarketAnalysis } from "@/lib/finance-ai-types";

/** Poll GET /premarket after POST 202 — aligned with PremarketFunction Timeout (600s). */
export const PREMARKET_POLL_INTERVAL_MS = 10_000;
export const PREMARKET_POLL_MAX_ATTEMPTS = 72;

export function premarketPollTimeoutHint(): string {
  const minutes = Math.ceil(
    (PREMARKET_POLL_MAX_ATTEMPTS * PREMARKET_POLL_INTERVAL_MS) / 60_000
  );
  return `Pre-market no completó a tiempo (~${minutes} min). Pulsa de nuevo o revisa el error en AWS.`;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function lookupPremarket(
  premarketBySymbol: Record<string, FinanceAiPremarketAnalysis | null | undefined>,
  symbol: string
): FinanceAiPremarketAnalysis | null | undefined {
  const upper = symbol.toUpperCase();
  return premarketBySymbol[upper] ?? premarketBySymbol[symbol];
}

/** True while any symbol is running or not yet visible after a fresh PRE start. */
export function premarketAwaitingCompletion(
  premarketBySymbol: Record<string, FinanceAiPremarketAnalysis | null | undefined>,
  symbols: string[],
  treatMissingAsRunning = false
): boolean {
  for (const symbol of symbols) {
    const row = lookupPremarket(premarketBySymbol, symbol);
    if (!row) {
      if (treatMissingAsRunning) return true;
      continue;
    }
    if (row.status === "running") return true;
  }
  return false;
}

export function premarketCompletionPatches(
  premarketBySymbol: Record<string, FinanceAiPremarketAnalysis | null | undefined>,
  symbols: string[]
): Record<string, FinanceAiPremarketAnalysis | null> {
  const patches: Record<string, FinanceAiPremarketAnalysis | null> = {};
  for (const symbol of symbols) {
    const row = lookupPremarket(premarketBySymbol, symbol);
    if (row && row.status !== "running") {
      patches[symbol] = row;
    }
  }
  return patches;
}

export function premarketCompletionMessage(
  premarketBySymbol: Record<string, FinanceAiPremarketAnalysis | null | undefined>,
  symbols: string[]
): string {
  let ready = 0;
  let errors = 0;
  for (const symbol of symbols) {
    const row = lookupPremarket(premarketBySymbol, symbol);
    if (!row || row.status === "running") continue;
    if (row.status === "error") {
      errors += 1;
    } else {
      ready += 1;
    }
  }
  const base = `PRE listo · ${ready}/${symbols.length} ticker(s)`;
  return errors > 0 ? `${base} · ${errors} error(es)` : base;
}
