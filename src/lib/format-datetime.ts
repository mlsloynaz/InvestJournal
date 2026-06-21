const DISPLAY_TZ = "America/New_York";

/** Avoid SSR/client hydration mismatches from locale-specific spaces (e.g. U+202F). */
function normalizeIntl(value: string): string {
  return value.replace(/\u202f/g, " ").replace(/\u00a0/g, " ").trim();
}

/** ISO timestamp from FinanceAI → readable local display (premarket / US market context). */
export function formatFinanceAiTimestamp(iso: string | undefined | null): string {
  if (!iso?.trim()) return "—";
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) return iso;
  return normalizeIntl(
    new Intl.DateTimeFormat("es-ES", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: DISPLAY_TZ,
    }).format(parsed)
  );
}

/** Milliseconds → human duration (e.g. "2m 14s", "850ms"). */
export function formatDurationMs(ms: number | undefined | null): string {
  if (ms == null || Number.isNaN(ms)) return "—";
  const n = Math.max(0, Math.round(ms));
  if (n < 1000) return `${n}ms`;
  const sec = Math.floor(n / 1000);
  if (sec < 60) return `${(n / 1000).toFixed(1)}s`;
  const min = Math.floor(sec / 60);
  const rem = sec % 60;
  if (min < 60) return rem > 0 ? `${min}m ${rem}s` : `${min}m`;
  const hr = Math.floor(min / 60);
  const remMin = min % 60;
  return remMin > 0 ? `${hr}h ${remMin}m` : `${hr}h`;
}

/** Bar datetime from Alpha Vantage (YYYY-MM-DD or YYYY-MM-DD HH:MM:SS). */
export function formatBarDatetime(value: string | undefined | null): string {
  if (!value?.trim()) return "—";
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const hasTime = normalized.includes(":");
  const parsed = Date.parse(hasTime ? normalized : `${normalized}T12:00:00`);
  if (Number.isNaN(parsed)) return value;
  return normalizeIntl(
    new Intl.DateTimeFormat("es-ES", {
      dateStyle: "medium",
      ...(hasTime ? { timeStyle: "short" as const } : {}),
      timeZone: DISPLAY_TZ,
    }).format(parsed)
  );
}
