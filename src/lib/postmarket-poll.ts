import type { FinanceAiPostmarketAnalysis } from "@/lib/finance-ai-types";

/** Poll GET /postmarket after POST 202 (Bedrock may take several minutes). */
export const POSTMARKET_POLL_INTERVAL_MS = 15_000;
export const POSTMARKET_POLL_MAX_ATTEMPTS = 60;

export function postmarketPollTimeoutHint(): string {
  const minutes = Math.ceil(
    (POSTMARKET_POLL_MAX_ATTEMPTS * POSTMARKET_POLL_INTERVAL_MS) / 60_000
  );
  return `Post-market no completó a tiempo (~${minutes} min). Revisa AWS o espera al cierre (~5 PM ET) si faltan velas de sesión.`;
}

function lookupPostmarket(
  postmarketBySymbol: Record<string, FinanceAiPostmarketAnalysis | null | undefined>,
  symbol: string
): FinanceAiPostmarketAnalysis | null | undefined {
  const upper = symbol.toUpperCase();
  return postmarketBySymbol[upper] ?? postmarketBySymbol[symbol];
}

export function postmarketReadyToday(
  analysis: FinanceAiPostmarketAnalysis | null | undefined,
  today: string
): boolean {
  if (!analysis || analysis.status === "running") return false;
  if (analysis.date && analysis.date !== today) return false;
  if (analysis.status === "error") return true;
  return (
    analysis.status === "ready" ||
    Boolean(analysis.report?.summary) ||
    Boolean(analysis.outcomes)
  );
}

/** True while any symbol is running or not yet visible after a fresh POST start. */
export function postmarketAwaitingCompletion(
  postmarketBySymbol: Record<string, FinanceAiPostmarketAnalysis | null | undefined>,
  symbols: string[],
  today: string,
  treatMissingAsRunning = false
): boolean {
  for (const symbol of symbols) {
    const row = lookupPostmarket(postmarketBySymbol, symbol);
    if (!row) {
      if (treatMissingAsRunning) return true;
      continue;
    }
    if (row.status === "running") return true;
    if (!postmarketReadyToday(row, today) && treatMissingAsRunning) return true;
  }
  return false;
}

export function postmarketCompletionMessage(
  postmarketBySymbol: Record<string, FinanceAiPostmarketAnalysis | null | undefined>,
  symbols: string[],
  today: string
): string {
  let ready = 0;
  let errors = 0;
  for (const symbol of symbols) {
    const row = lookupPostmarket(postmarketBySymbol, symbol);
    if (!row || row.status === "running") continue;
    if (row.status === "error") {
      errors += 1;
    } else if (postmarketReadyToday(row, today)) {
      ready += 1;
    }
  }
  const base = `Post listo · ${ready}/${symbols.length} ticker(s)`;
  return errors > 0 ? `${base} · ${errors} error(es)` : base;
}
