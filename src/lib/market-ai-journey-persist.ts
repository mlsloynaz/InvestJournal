import type {
  JourneyAwsSnapshot,
  JourneyProcessControl,
  JourneyProcessKey,
  JourneyStepId,
  JourneyStepStatus,
} from "@/lib/market-ai-journey";
import type { NowPollingSession } from "@/lib/now-polling-session";

export type PersistedMarketAiJourney = {
  aws: JourneyAwsSnapshot;
  stepStatuses: Record<JourneyStepId, JourneyStepStatus>;
  processControl: JourneyProcessControl;
  nowPolling?: NowPollingSession;
};

export const DEFAULT_JOURNEY_PROCESS_CONTROL: JourneyProcessControl = {
  now: "off",
  post: "off",
};

export function journeyProcessStepId(key: JourneyProcessKey): JourneyStepId {
  if (key === "now") return "now-status";
  return "post-status";
}

/** POST is one-shot: active only while AWS reports in progress. NOW polling uses nowPolling.active. */
export function isJourneyProcessActive(
  key: JourneyProcessKey,
  control: JourneyProcessControl,
  stepStatuses: Record<JourneyStepId, JourneyStepStatus>,
  nowPolling?: NowPollingSession | null
): boolean {
  const visual = stepStatuses[journeyProcessStepId(key)]?.visual ?? "pending";
  if (key === "post") {
    return visual === "working";
  }
  if (key === "now") {
    return Boolean(nowPolling?.active);
  }
  if (control[key] === "on") return true;
  return visual === "working";
}

export function journeyProcessButtonLabel(
  key: JourneyProcessKey,
  control: JourneyProcessControl,
  stepStatuses: Record<JourneyStepId, JourneyStepStatus>
): string {
  if (isJourneyProcessActive(key, control, stepStatuses)) {
    return "Detener";
  }
  const visual = stepStatuses[journeyProcessStepId(key)]?.visual ?? "pending";
  if (key === "post" && visual === "done") {
    return "Iniciar de nuevo";
  }
  return "Iniciar";
}

/** Clear stale on flags for one-shot processes that already finished. */
export function normalizeProcessControl(
  control: JourneyProcessControl,
  stepStatuses: Record<JourneyStepId, JourneyStepStatus>
): JourneyProcessControl {
  const next: JourneyProcessControl = { ...control };
  if (next.post === "on" && stepStatuses[journeyProcessStepId("post")]?.visual !== "working") {
    next.post = "off";
  }
  return next;
}
