/** Data window and purpose for each Market AI journey process (matches FinanceAI backend). */

export type MarketAiProcessScope = {
  key: "now" | "post";
  label: string;
  /** Human-readable time window for bars / evaluation */
  dataWindow: string;
  /** What bars and indicators include */
  dataIncludes: string;
  /** Why this process runs */
  purpose: string;
  /** Optional nuance (polling vs manual, comparison, etc.) */
  note?: string;
};

/** Default playbook ids for batch strategy evaluation (fallback when AWS unavailable). */
export const MARKET_START_DEFAULT_STRATEGIES = [
  "estrategia-01",
  "estrategia-02",
  "estrategia-03",
  "estrategia-04",
  "bolinger-15-change-trend",
] as const;

export type PlaybookCurrentEntry = { id: string; title: string };

/** Playbooks selectable for PRE / NOW / POST (scheduleSettings.evaluateStrategyIds). */
export const MARKET_AI_EVALUABLE_STRATEGIES = MARKET_START_DEFAULT_STRATEGIES;

export const MARKET_AI_EVALUABLE_STRATEGIES_FALLBACK: PlaybookCurrentEntry[] =
  MARKET_START_DEFAULT_STRATEGIES.map((id) => ({
    id,
    title: id,
  }));

export const MARKET_AI_PROCESS_SCOPES: MarketAiProcessScope[] = [
  {
    key: "now",
    label: "NOW",
    dataWindow: "9:30 AM ET → momento de evaluación (tope 4:00 PM ET)",
    dataIncludes:
      "Barras intradía; indicadores MA/BB/trends; checklist por playbook.",
    purpose: "Evaluar estrategias en sesión (Result Now o check por ticker).",
    note: "POST /tickers/check · GET /tickers/check/result · POST /bars/refresh.",
  },
  {
    key: "post",
    label: "Post Market",
    dataWindow: "Sesión regular 9:30 AM – 4:00 PM ET del trade date",
    dataIncludes:
      "OHLC de la sesión (15m), daily EOD refrescado, checklist al cierre (phase=POST).",
    purpose:
      "Lograr ¿se cumplió cada estrategia propuesta en PRE? Comparar premarket (morning) vs resultado real del día.",
    note:
      "Usa preBaseline si hubo NOW; evaluate_premarket_outcomes + panorama_diff morning/evening.",
  },
];

export function processScopeFor(key: "now" | "post"): MarketAiProcessScope {
  return MARKET_AI_PROCESS_SCOPES.find((s) => s.key === key)!;
}
