export const TOOLS_DOCS_PATH = "/tools/docs";
export const TOOLS_PLAN_INVERSION_PATH = "/tools/plan-inversion";
/** @deprecated Redirects to MARKET_PATH — kept for legacy links */
export const TOOLS_GESTION_PATH = "/gestion";
export const MARKET_PATH = "/market";
export const MARKET_BB15_TAB = "bb15";
export const MARKET_BB15_PATH = `${MARKET_PATH}?tab=${MARKET_BB15_TAB}`;
export const MARKET_TESTING_CRITERIAS_TAB = "testing-criterias";
export const MARKET_TESTING_CRITERIAS_PATH = `${MARKET_PATH}?tab=${MARKET_TESTING_CRITERIAS_TAB}`;
/** @deprecated Use MARKET_BB15_PATH — kept for redirects and legacy links */
export const GESTION_BB15_15M_PATH = MARKET_BB15_PATH;
export const GESTION_TESTING_CRITERIAS_PATH = MARKET_TESTING_CRITERIAS_PATH;
/** @deprecated Use MARKET_PATH */
export const GESTION_NOW_LIVE_PATH = MARKET_PATH;

export const TOOLS_DOCUMENTATION_BASE = "/tools/documentation";

export const TOOLS_STRATEGIES_PATH = `${TOOLS_DOCUMENTATION_BASE}/strategies`;
export const TOOLS_STRATEGIES_DOCS_PATH = `${TOOLS_STRATEGIES_PATH}/docs`;

export function strategyDocPath(slug: string): string {
  return `${TOOLS_STRATEGIES_DOCS_PATH}/${slug}`;
}

export const TOOLS_WEBSITES_PATH = `${TOOLS_DOCUMENTATION_BASE}/websites`;
export const TOOLS_INDICADORES_PATH = `${TOOLS_DOCUMENTATION_BASE}/indicadores`;