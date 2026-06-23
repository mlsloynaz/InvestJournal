/** MySQL general_settings key for selected evaluate-strategy playbook ids. */
export const EVALUATE_STRATEGY_IDS_SETTING_KEY = "evaluate_strategy_ids";

export type PlaybookCurrentEntry = { id: string; title: string; shortCode?: string };

/** Short codes aligned with playbook-current order (E01–E05). */
export const PLAYBOOK_SHORT_CODE_BY_ID: Record<string, string> = {
  "estrategia-01": "e01",
  "estrategia-02": "e02",
  "estrategia-03": "e03",
  "estrategia-04": "e04",
  "bolinger-15-change-trend": "e05",
};

export const PLAYBOOK_ID_BY_SHORT_CODE: Record<string, string> = Object.fromEntries(
  Object.entries(PLAYBOOK_SHORT_CODE_BY_ID).map(([id, code]) => [code, id])
);

const FALLBACK_CATALOG_IDS = Object.keys(PLAYBOOK_SHORT_CODE_BY_ID);

export function shortCodeForStrategyId(id: string): string {
  return PLAYBOOK_SHORT_CODE_BY_ID[id] ?? id;
}

export function attachShortCodes(catalog: PlaybookCurrentEntry[]): PlaybookCurrentEntry[] {
  return catalog.map((entry) => ({
    ...entry,
    shortCode: shortCodeForStrategyId(entry.id),
  }));
}

/** Resolve playbook id from full id or short code (e01…e05). */
export function resolveStrategyId(idOrCode: string, catalogIds?: string[]): string | null {
  const raw = idOrCode.trim();
  if (!raw) return null;

  const fromShort = PLAYBOOK_ID_BY_SHORT_CODE[raw.toLowerCase()];
  const candidate = fromShort ?? raw;

  const allowed = catalogIds?.length ? catalogIds : FALLBACK_CATALOG_IDS;
  const exact = allowed.find((id) => id === candidate);
  if (exact) return exact;

  const ci = allowed.find((id) => id.toLowerCase() === candidate.toLowerCase());
  return ci ?? null;
}

/** Keep only ids present in playbook-current catalog; preserve order. */
export function normalizeEvaluateStrategyIds(ids: string[], catalogIds: string[]): string[] {
  const allowed = catalogIds.length ? catalogIds : FALLBACK_CATALOG_IDS;
  const out: string[] = [];
  for (const id of ids) {
    const resolved = resolveStrategyId(id, allowed);
    if (resolved && !out.includes(resolved)) out.push(resolved);
  }
  return out;
}

export function parseEvaluateStrategyIdsJson(raw: string | null | undefined): string[] | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed.map((v) => String(v).trim()).filter(Boolean);
  } catch {
    return null;
  }
}

/** Fields the deployed schedules PUT accepts when merging evaluateStrategyIds. */
export function schedulePreservePayloadFromSettings(settings: {
  scheduledJobsEnabled: boolean;
  bolinger15Tickers?: string[];
  bolinger15TickersSource?: string | null;
  watchlist?: string[];
  watchlistSource?: string | null;
}): Record<string, unknown> {
  if (settings.bolinger15Tickers?.length) {
    return {
      bolinger15Tickers: settings.bolinger15Tickers,
      ...(settings.bolinger15TickersSource
        ? { bolinger15TickersSource: settings.bolinger15TickersSource }
        : {}),
    };
  }
  if (settings.watchlist?.length) {
    return {
      symbols: settings.watchlist,
      ...(settings.watchlistSource ? { watchlistSource: settings.watchlistSource } : {}),
    };
  }
  return { scheduledJobsEnabled: settings.scheduledJobsEnabled };
}
