import type { FinanceAiMov15mStatus } from "@/lib/finance-ai-types";
import {
  fetchFinanceAiMov15mStatus,
  fetchFinanceAiMov15mStatusSummary,
  triggerFinanceAiMov15mCheck,
} from "@/server/actions/finance-ai";

const MOV15M_STATUS_API = "GET/POST /context/mov15m/status";
export const MOV15M_TICK_POLL_MS = 2_000;
export const MOV15M_TICK_POLL_MAX_MS = 900_000;

export function mov15mPhaseMatchesPoll(
  expectedPhase: string | undefined,
  phase: string | undefined
): boolean {
  if (!expectedPhase) return true;
  if (!phase) return false;
  if (phase === expectedPhase) return true;
  if (
    (expectedPhase === "full_assessment" || expectedPhase === "full_assessment_inside_b15m") &&
    (phase.startsWith("full_assessment") || phase === "session_complete")
  ) {
    return true;
  }
  if (expectedPhase === "premarket_now" && phase === "premarket_now") return true;
  if (expectedPhase === "in_market_now" && phase === "in_market_now") return true;
  if (expectedPhase === "post_market_now" && phase === "post_market_now") return true;
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function pollMov15mTickComplete(
  baselineLastRunAt: string | undefined,
  expectedPhase?: string,
  onProgress?: (message: string) => void
): Promise<{
  success: boolean;
  status?: FinanceAiMov15mStatus;
  error?: string;
}> {
  const started = Date.now();
  const deadline = started + MOV15M_TICK_POLL_MAX_MS;
  while (Date.now() < deadline) {
    await sleep(MOV15M_TICK_POLL_MS);
    const elapsedSec = Math.round((Date.now() - started) / 1000);
    onProgress?.(
      `mov15m en AWS… ${elapsedSec}s (hasta ${Math.round(MOV15M_TICK_POLL_MAX_MS / 1000)}s; muchos tickers puede tardar ~10 min)`
    );
    const snap = await fetchFinanceAiMov15mStatusSummary();
    if (!snap.success) continue;
    const lastRunAt = snap.lastRunAt;
    const phase = snap.lastRunPhase ?? snap.phase;
    if (lastRunAt && lastRunAt !== baselineLastRunAt) {
      if (mov15mPhaseMatchesPoll(expectedPhase, phase)) {
        const full = await fetchFinanceAiMov15mStatus({ persist: true });
        if (full.success && full.status) {
          return { success: true, status: full.status };
        }
        return { success: false, error: full.error ?? "Error cargando evaluación mov15m" };
      }
    }
  }
  return {
    success: false,
    error:
      `mov15m evaluation timed out (${MOV15M_STATUS_API}). ` +
      "Revisa CloudWatch `finance-ai-mov15m` y refresca el panel en 1–2 min.",
  };
}

export async function applyMov15mTriggerResult(
  result: Awaited<ReturnType<typeof triggerFinanceAiMov15mCheck>>,
  applyStatus: (status: FinanceAiMov15mStatus) => void,
  refresh: () => Promise<void>,
  onProgress?: (message: string) => void
): Promise<{ ok: boolean; error?: string }> {
  if (!result.success) {
    return { ok: false, error: result.error ?? "Error en evaluación mov15m" };
  }
  if (result.accepted) {
    onProgress?.("Evaluación manual encolada en AWS…");
    const polled = await pollMov15mTickComplete(
      result.baselineLastRunAt,
      result.phase,
      onProgress
    );
    if (!polled.success || !polled.status) {
      return { ok: false, error: polled.error ?? "Error esperando evaluación mov15m" };
    }
    applyStatus(polled.status);
    return { ok: true };
  }
  if (result.status) {
    applyStatus(result.status);
    return { ok: true };
  }
  await refresh();
  return { ok: true };
}

export async function waitForMov15mTriggerResult(
  result: Awaited<ReturnType<typeof triggerFinanceAiMov15mCheck>>,
  onProgress?: (message: string) => void
): Promise<{ ok: boolean; error?: string }> {
  if (!result.success) {
    return { ok: false, error: result.error ?? "Error en evaluación mov15m" };
  }
  if (result.accepted) {
    onProgress?.("1m polling encolado en AWS…");
    const polled = await pollMov15mTickComplete(
      result.baselineLastRunAt,
      result.phase,
      onProgress
    );
    if (!polled.success) {
      return { ok: false, error: polled.error ?? "Error esperando polling mov15m" };
    }
    return { ok: true };
  }
  return { ok: true };
}
