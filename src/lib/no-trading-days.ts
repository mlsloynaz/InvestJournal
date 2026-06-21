const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export type NoTradingDayRow = {
  date: string;
  label: string | null;
  source: string | null;
};

/** Normalize YYYY-MM-DD; returns null if invalid. */
export function parseTradeDateIso(raw: string): string | null {
  const trimmed = raw.trim();
  if (!ISO_DATE.test(trimmed)) return null;
  const [y, m, d] = trimmed.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== m - 1 ||
    dt.getUTCDate() !== d
  ) {
    return null;
  }
  return trimmed;
}

export function sortNoTradingDays(rows: NoTradingDayRow[]): NoTradingDayRow[] {
  return [...rows].sort((a, b) => a.date.localeCompare(b.date));
}

export function mergeNoTradingDayRows(
  existing: NoTradingDayRow[],
  incoming: NoTradingDayRow[]
): NoTradingDayRow[] {
  const byDate = new Map<string, NoTradingDayRow>();
  for (const row of existing) {
    byDate.set(row.date, row);
  }
  for (const row of incoming) {
    byDate.set(row.date, row);
  }
  return sortNoTradingDays([...byDate.values()]);
}

export function isNoTradingDay(dateEt: string, excluded: ReadonlySet<string>): boolean {
  return excluded.has(dateEt);
}

export function noTradingDaySet(rows: NoTradingDayRow[]): Set<string> {
  return new Set(rows.map((r) => r.date));
}
