import { MARKET_PATH, MARKET_TESTING_CRITERIAS_TAB } from "@/lib/tools-paths";

export type TestingCriteriasDeepLink = {
  symbols?: string[];
  strategyId?: string;
  variantId?: string;
  ruleKey?: string;
  checkId?: string;
  timeframe?: string;
};

/** Build Market → Testing criterias URL with optional pre-selection. */
export function buildTestingCriteriasHref(params: TestingCriteriasDeepLink): string {
  const q = new URLSearchParams();
  q.set("tab", MARKET_TESTING_CRITERIAS_TAB);
  const symbols = [...new Set((params.symbols ?? []).map((s) => s.trim().toUpperCase()).filter(Boolean))];
  if (symbols.length > 0) q.set("symbols", symbols.join(","));
  if (params.strategyId) q.set("strategy", params.strategyId);
  if (params.variantId) q.set("variant", params.variantId);
  if (params.ruleKey) q.set("rule", params.ruleKey);
  if (params.checkId) q.set("check", params.checkId);
  if (params.timeframe) q.set("tf", params.timeframe);
  return `${MARKET_PATH}?${q.toString()}`;
}

export const E03_STRATEGY_ID = "estrategia-03";
export const E03_BB_EXPOSURE_RULE = "bb_exposure";

/** E03 req3 (15m fuera de BB) — Outside Bolinger panel / testing criterias. */
export function buildE03BbExposureTestHref(symbols: string[]): string {
  return buildTestingCriteriasHref({
    symbols,
    strategyId: E03_STRATEGY_ID,
    ruleKey: E03_BB_EXPOSURE_RULE,
    timeframe: "15m",
  });
}

export function parseTestingCriteriasSearchParams(
  raw: Record<string, string | string[] | undefined>
): TestingCriteriasDeepLink {
  const one = (key: string) => {
    const v = raw[key];
    if (Array.isArray(v)) return v[0];
    return v;
  };
  const symbolsRaw = one("symbols");
  return {
    symbols: symbolsRaw
      ? symbolsRaw
          .split(/[,;\s]+/)
          .map((s) => s.trim().toUpperCase())
          .filter(Boolean)
      : undefined,
    strategyId: one("strategy")?.trim(),
    variantId: one("variant")?.trim(),
    ruleKey: one("rule")?.trim(),
    checkId: one("check")?.trim(),
    timeframe: one("tf")?.trim(),
  };
}
