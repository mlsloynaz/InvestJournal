export const PREMARKET_COOLDOWN_MS = 5 * 60 * 1000;
export const STRATEGIES_REFRESH_COOLDOWN_MS = 60 * 1000;

export function premarketCooldownRemainingMs(
  lastAt: string | Date | null | undefined,
  nowMs: number = Date.now()
): number {
  if (!lastAt) return 0;
  const lastMs = typeof lastAt === "string" ? new Date(lastAt).getTime() : lastAt.getTime();
  if (!Number.isFinite(lastMs)) return 0;
  return Math.max(0, PREMARKET_COOLDOWN_MS - (nowMs - lastMs));
}

export function canRunPremarket(lastAt: string | Date | null | undefined): boolean {
  return premarketCooldownRemainingMs(lastAt) === 0;
}

export function premarketCooldownHint(remainingMs: number): string {
  const mins = Math.ceil(remainingMs / 60_000);
  return `Espera ${mins} min antes de repetir pre-market (mín. 5 min).`;
}

export function strategiesRefreshCooldownRemainingMs(
  lastAt: string | Date | number | null | undefined,
  nowMs: number = Date.now()
): number {
  if (lastAt == null) return 0;
  const lastMs =
    typeof lastAt === "number"
      ? lastAt
      : typeof lastAt === "string"
        ? new Date(lastAt).getTime()
        : lastAt.getTime();
  if (!Number.isFinite(lastMs)) return 0;
  return Math.max(0, STRATEGIES_REFRESH_COOLDOWN_MS - (nowMs - lastMs));
}

export function strategiesRefreshCooldownHint(remainingMs: number): string {
  const secs = Math.ceil(remainingMs / 1000);
  return `Espera ${secs} s antes de actualizar estrategias de nuevo.`;
}
