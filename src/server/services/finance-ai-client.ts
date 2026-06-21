import type {
  FinanceAiFomcMeeting,
  FinanceAiGlobalContext,
  FinanceAiMarketCalendar,
  FinanceAiNewsSentiment,
  FinanceAiPremarketAnalysis,
  FinanceAiPostmarketAnalysis,
  FinanceAiPostmarketStats,
  FinanceAiPublishResponse,
  FinanceAiRulesCheckResponse,
  FinanceAiRuleSpec,
  FinanceAiTickersNow,
  FinanceAiTickerContext,
} from "@/lib/finance-ai-types";

export class FinanceAiConfigError extends Error {
  constructor() {
    super("FINANCE_AI_API_URL and FINANCE_AI_API_KEY must be set in .env");
    this.name = "FinanceAiConfigError";
  }
}

function getConfig(): { baseUrl: string; apiKey: string } {
  const baseUrl = process.env.FINANCE_AI_API_URL?.trim().replace(/\/$/, "");
  const apiKey = process.env.FINANCE_AI_API_KEY?.trim();
  if (!baseUrl || !apiKey) {
    throw new FinanceAiConfigError();
  }
  return { baseUrl, apiKey };
}

/** Intake flows API — separate API Gateway; falls back to main URL until deployed. */
function getIntakeConfig(): { baseUrl: string; apiKey: string } {
  const { apiKey } = getConfig();
  const intakeUrl = process.env.FINANCE_AI_INTAKE_API_URL?.trim().replace(/\/$/, "");
  if (intakeUrl) {
    return { baseUrl: intakeUrl, apiKey };
  }
  return getConfig();
}

/** Calendar API — separate API Gateway; falls back to main URL until deployed. */
function getCalendarConfig(): { baseUrl: string; apiKey: string } {
  const { apiKey } = getConfig();
  const calendarUrl = process.env.FINANCE_AI_CALENDAR_API_URL?.trim().replace(/\/$/, "");
  if (calendarUrl) {
    return { baseUrl: calendarUrl, apiKey };
  }
  return getConfig();
}

/** Stock aux API — BB15, config, strategies (separate gateway; falls back to main URL). */
function getStockAuxConfig(): { baseUrl: string; apiKey: string } {
  const { apiKey } = getConfig();
  const auxUrl = process.env.FINANCE_AI_STOCK_AUX_API_URL?.trim().replace(/\/$/, "");
  if (auxUrl) {
    return { baseUrl: auxUrl, apiKey };
  }
  return getConfig();
}

export function isFinanceAiConfigured(): boolean {
  try {
    getConfig();
    return true;
  } catch {
    return false;
  }
}

function isFinanceAiDebugEnabled(): boolean {
  const value = process.env.FINANCE_AI_DEBUG?.trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}

function summarizeFinanceAiBody(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== "object") {
    return { body: body ?? null };
  }
  const record = body as Record<string, unknown>;
  const summary: Record<string, unknown> = {};
  for (const key of [
    "symbol",
    "status",
    "success",
    "error",
    "updatedAt",
    "bias",
    "revision",
  ]) {
    if (key in record) {
      summary[key] = record[key];
    }
  }
  if ("historicalData" in record && record.historicalData) {
    summary.historicalData = record.historicalData;
  }
  return summary;
}

function logFinanceAiRequest(
  method: string,
  url: string,
  status: number,
  body: unknown
): void {
  if (!isFinanceAiDebugEnabled()) return;
  console.info(
    "[FinanceAI]",
    `${method} ${url}`,
    `→ ${status}`,
    summarizeFinanceAiBody(body)
  );
}

async function financeAiFetch<T>(
  path: string,
  init?: RequestInit,
  config?: { baseUrl: string; apiKey: string }
): Promise<{ ok: true; data: T } | { ok: false; status: number; error: string }> {
  const { baseUrl, apiKey } = config ?? getConfig();
  const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;

  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Network error";
    logFinanceAiRequest(init?.method ?? "GET", url, 0, { error: message });
    return {
      ok: false,
      status: 0,
      error: `${message} — revisa FINANCE_AI_API_URL / FINANCE_AI_STOCK_AUX_API_URL tras sam deploy`,
    };
  }

  const text = await response.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { error: text.slice(0, 500) };
    }
  }

  logFinanceAiRequest(init?.method ?? "GET", url, response.status, body);

  if (!response.ok) {
    const errObj = body as { error?: string; message?: string };
    const error =
      errObj?.error ??
      errObj?.message ??
      `FinanceAI request failed (${response.status})`;
    return { ok: false, status: response.status, error };
  }

  return { ok: true, data: body as T };
}

async function financeAiIntakeFetch<T>(
  path: string,
  init?: RequestInit
): Promise<{ ok: true; data: T } | { ok: false; status: number; error: string }> {
  const { baseUrl, apiKey } = getIntakeConfig();
  const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;

  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Network error";
    logFinanceAiRequest(init?.method ?? "GET", url, 0, { error: message });
    return {
      ok: false,
      status: 0,
      error: `${message} — revisa FINANCE_AI_INTAKE_API_URL tras sam deploy`,
    };
  }

  const text = await response.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { error: text.slice(0, 500) };
    }
  }

  logFinanceAiRequest(init?.method ?? "GET", url, response.status, body);

  if (!response.ok) {
    const errObj = body as { error?: string; message?: string };
    const error =
      errObj?.error ??
      errObj?.message ??
      `FinanceAI intake request failed (${response.status})`;
    return { ok: false, status: response.status, error };
  }

  return { ok: true, data: body as T };
}

async function financeAiStockAuxFetch<T>(
  path: string,
  init?: RequestInit
): Promise<{ ok: true; data: T } | { ok: false; status: number; error: string }> {
  return financeAiFetch<T>(path, init, getStockAuxConfig());
}

export async function publishStrategies(payload: {
  filename: string;
  content: string;
  source?: string;
  sourceFiles?: string[];
  playbooks?: unknown[];
  playbooksVersion?: number;
}): Promise<{ ok: true; data: FinanceAiPublishResponse } | { ok: false; error: string }> {
  const result = await financeAiStockAuxFetch<FinanceAiPublishResponse>("/context/strategies", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, data: result.data };
}

export async function publishAnalysisFramework(payload: {
  filename: string;
  content: string;
  source?: string;
}): Promise<{ ok: true; data: FinanceAiPublishResponse } | { ok: false; error: string }> {
  const result = await financeAiStockAuxFetch<FinanceAiPublishResponse>(
    "/context/analysis-framework",
    {
      method: "PUT",
      body: JSON.stringify(payload),
    }
  );
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, data: result.data };
}

export async function getStrategiesContext(): Promise<
  { ok: true; data: FinanceAiGlobalContext } | { ok: false; error: string }
> {
  const result = await financeAiStockAuxFetch<FinanceAiGlobalContext>("/context/strategies");
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, data: result.data };
}

export async function getAnalysisFrameworkContext(): Promise<
  { ok: true; data: FinanceAiGlobalContext } | { ok: false; error: string }
> {
  const result = await financeAiStockAuxFetch<FinanceAiGlobalContext>(
    "/context/analysis-framework"
  );
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, data: result.data };
}

export async function getTickerContext(symbol: string): Promise<
  { ok: true; data: FinanceAiTickerContext } | { ok: false; error: string }
> {
  const result = await financeAiFetch<FinanceAiTickerContext>(
    `/tickers/${encodeURIComponent(symbol)}/context`
  );
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, data: result.data };
}

export type FinanceAiStoredCalendar = FinanceAiMarketCalendar & {
  contextType?: string;
  updatedAt?: string;
  from?: string;
  to?: string;
  skippedRefresh?: boolean;
  skipReason?: string;
  economicCount?: number;
  fomcCount?: number;
  earningsCount?: number;
  fomcEvents?: { date?: string; event?: string; sep?: boolean }[];
  earningsBySymbol?: Record<string, { date?: string; hour?: string; symbol?: string }[]>;
  fomcScheduleYear?: number;
  fomcScheduleProvided?: boolean;
  fomcScheduleSource?: string;
  fomcScheduleWarning?: string | null;
  fomcMeetings?: FinanceAiFomcMeeting[];
};

export async function getMarketCalendar(): Promise<
  { ok: true; data: FinanceAiStoredCalendar } | { ok: false; error: string }
> {
  const result = await financeAiFetch<FinanceAiStoredCalendar>(
    "/context/market-calendar",
    undefined,
    getCalendarConfig()
  );
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, data: result.data };
}

export async function refreshMarketCalendar(
  symbols?: string[],
  options?: { force?: boolean }
): Promise<
  { ok: true; data: FinanceAiStoredCalendar } | { ok: false; error: string }
> {
  const { baseUrl, apiKey } = getCalendarConfig();
  const url = `${baseUrl}/context/market-calendar/refresh`;
  const payload: { symbols?: string[]; force?: boolean } = {};
  if (symbols && symbols.length > 0) payload.symbols = symbols;
  if (options?.force) payload.force = true;
  const body = JSON.stringify(payload);

  const before = await getMarketCalendar();
  const beforeUpdated = before.ok ? before.data.updatedAt : null;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(PREMARKET_FETCH_MS),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Network error";
    return { ok: false, error: message };
  }

  const text = await response.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { error: text.slice(0, 500) };
    }
  }

  logFinanceAiRequest("POST", url, response.status, parsed);

  if (response.status === 202) {
    let lastPoll: FinanceAiStoredCalendar | null = null;
    for (let attempt = 0; attempt < 24; attempt += 1) {
      if (attempt > 0) {
        await new Promise((r) => setTimeout(r, 5000));
      }
      const poll = await getMarketCalendar();
      if (poll.ok) {
        lastPoll = poll.data;
        if (poll.data.updatedAt && poll.data.updatedAt !== beforeUpdated) {
          return { ok: true, data: poll.data };
        }
      }
    }
    if (lastPoll?.updatedAt) {
      return { ok: true, data: lastPoll };
    }
    return { ok: false, error: "Calendar refresh timed out — retry GET in a minute." };
  }

  if (!response.ok) {
    const errObj = parsed as { error?: string; message?: string };
    return {
      ok: false,
      error: errObj?.error ?? errObj?.message ?? `Calendar refresh failed (${response.status})`,
    };
  }

  const data = parsed as { success?: boolean; calendar?: FinanceAiStoredCalendar };
  const cal = data.calendar ?? (parsed as FinanceAiStoredCalendar);
  return { ok: true, data: cal };
}

const PREMARKET_FETCH_MS = 300_000;

export async function getNewsSentiment(symbol: string): Promise<
  { ok: true; data: FinanceAiNewsSentiment } | { ok: false; error: string }
> {
  const result = await financeAiFetch<FinanceAiNewsSentiment>(
    `/tickers/${encodeURIComponent(symbol)}/news-sentiment`
  );
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, data: result.data };
}

export async function refreshNewsSentiment(symbol: string): Promise<
  { ok: true; data: FinanceAiNewsSentiment } | { ok: false; error: string }
> {
  const { baseUrl, apiKey } = getConfig();
  const url = `${baseUrl}/tickers/${encodeURIComponent(symbol)}/news-sentiment`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: "{}",
      cache: "no-store",
      signal: AbortSignal.timeout(PREMARKET_FETCH_MS),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Network error";
    return { ok: false, error: message };
  }

  const text = await response.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { error: text.slice(0, 500) };
    }
  }

  logFinanceAiRequest("POST", url, response.status, parsed);

  if (!response.ok) {
    const errObj = parsed as { error?: string; message?: string };
    return {
      ok: false,
      error:
        errObj?.error ??
        errObj?.message ??
        `News refresh failed (${response.status})`,
    };
  }

  const data = parsed as FinanceAiNewsSentiment & { success?: boolean };
  return { ok: true, data };
}

export async function getPremarket(
  symbol: string,
  tradeDate?: string
): Promise<
  { ok: true; data: FinanceAiPremarketAnalysis } | { ok: false; error: string }
> {
  const dateQuery = tradeDate?.trim()
    ? `?date=${encodeURIComponent(tradeDate.trim())}`
    : "";
  const result = await financeAiFetch<FinanceAiPremarketAnalysis>(
    `/tickers/${encodeURIComponent(symbol)}/premarket${dateQuery}`
  );
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, data: result.data };
}

export async function runPremarket(
  symbol: string,
  mode: "full" | "now" | "refresh"
): Promise<
  | { ok: true; data: FinanceAiPremarketAnalysis; accepted?: boolean }
  | { ok: false; error: string }
> {
  const { baseUrl, apiKey } = getConfig();
  const url = `${baseUrl}/tickers/${encodeURIComponent(symbol)}/premarket`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({ mode }),
      cache: "no-store",
      signal: AbortSignal.timeout(PREMARKET_FETCH_MS),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Network error";
    logFinanceAiRequest("POST", url, 0, { error: message });
    return { ok: false, error: message };
  }

  const text = await response.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { error: text.slice(0, 500) };
    }
  }

  logFinanceAiRequest("POST", url, response.status, body);

  if (response.status === 202) {
    return { ok: true, data: body as FinanceAiPremarketAnalysis, accepted: true };
  }

  if (!response.ok) {
    const errObj = body as { error?: string; message?: string };
    return {
      ok: false,
      error: errObj?.error ?? errObj?.message ?? `Premarket failed (${response.status})`,
    };
  }

  return { ok: true, data: body as FinanceAiPremarketAnalysis };
}

export async function checkTicker(
  symbol: string,
  options?: {
    strategies?: string[];
    tradeDate?: string;
    simulationTimeEt?: string;
    simulationMinutesEt?: number;
    fresh?: boolean;
  }
): Promise<
  { ok: true; data: FinanceAiPremarketAnalysis } | { ok: false; error: string }
> {
  const { baseUrl, apiKey } = getConfig();
  const url = `${baseUrl}/tickers/${encodeURIComponent(symbol)}/check`;

  const payload: Record<string, unknown> = {};
  if (options?.strategies?.length) payload.strategies = options.strategies;
  if (options?.tradeDate?.trim()) payload.tradeDate = options.tradeDate.trim();
  if (options?.simulationTimeEt?.trim()) payload.simulationTimeEt = options.simulationTimeEt.trim();
  if (options?.simulationMinutesEt != null) payload.simulationMinutesEt = options.simulationMinutesEt;
  if (options?.fresh === true) payload.fresh = true;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: AbortSignal.timeout(PREMARKET_FETCH_MS),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Network error";
    logFinanceAiRequest("POST", url, 0, { error: message });
    return { ok: false, error: message };
  }

  const text = await response.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { error: text.slice(0, 500) };
    }
  }

  logFinanceAiRequest("POST", url, response.status, body);

  if (!response.ok) {
    const errObj = body as { error?: string; message?: string };
    return {
      ok: false,
      error: errObj?.error ?? errObj?.message ?? `Check failed (${response.status})`,
    };
  }

  return { ok: true, data: body as FinanceAiPremarketAnalysis };
}

export async function checkRules(params: {
  symbols: string[];
  rule: FinanceAiRuleSpec;
  fresh?: boolean;
  tradeDate?: string;
  simulationTimeEt?: string;
}): Promise<
  { ok: true; data: FinanceAiRulesCheckResponse } | { ok: false; error: string }
> {
  const { baseUrl, apiKey } = getConfig();
  const url = `${baseUrl}/rules/check`;

  const payload: Record<string, unknown> = {
    symbols: params.symbols,
    rule: params.rule,
    fresh: params.fresh === true,
  };
  if (params.tradeDate?.trim()) payload.tradeDate = params.tradeDate.trim();
  if (params.simulationTimeEt?.trim()) payload.simulationTimeEt = params.simulationTimeEt.trim();

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: AbortSignal.timeout(PREMARKET_FETCH_MS),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Network error";
    logFinanceAiRequest("POST", url, 0, { error: message });
    return { ok: false, error: message };
  }

  const text = await response.text();
  let parsed: Record<string, unknown> = {};
  if (text) {
    try {
      parsed = JSON.parse(text) as Record<string, unknown>;
    } catch {
      parsed = { error: text.slice(0, 500) };
    }
  }

  logFinanceAiRequest("POST", url, response.status, parsed);

  if (!response.ok) {
    const errObj = parsed as { error?: string; message?: string };
    return {
      ok: false,
      error: errObj?.error ?? errObj?.message ?? `Rules check failed (${response.status})`,
    };
  }

  const data =
    (parsed.rulesCheck as FinanceAiRulesCheckResponse | undefined) ??
    (parsed.result as FinanceAiRulesCheckResponse | undefined) ??
    (parsed as FinanceAiRulesCheckResponse);

  return { ok: true, data };
}

export async function getPostmarket(symbol: string): Promise<
  { ok: true; data: FinanceAiPostmarketAnalysis } | { ok: false; error: string }
> {
  const result = await financeAiFetch<FinanceAiPostmarketAnalysis>(
    `/tickers/${encodeURIComponent(symbol)}/postmarket`,
    { method: "GET" }
  );
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, data: result.data };
}

export async function runPostmarket(
  symbol: string
): Promise<
  | { ok: true; data: FinanceAiPostmarketAnalysis; accepted?: boolean }
  | { ok: false; error: string }
> {
  const { baseUrl, apiKey } = getConfig();
  const url = `${baseUrl}/tickers/${encodeURIComponent(symbol)}/postmarket`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({}),
      cache: "no-store",
      signal: AbortSignal.timeout(PREMARKET_FETCH_MS),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Network error";
    logFinanceAiRequest("POST", url, 0, { error: message });
    return { ok: false, error: message };
  }

  const text = await response.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { error: text.slice(0, 500) };
    }
  }

  logFinanceAiRequest("POST", url, response.status, body);

  if (response.status === 202) {
    return { ok: true, data: body as FinanceAiPostmarketAnalysis, accepted: true };
  }

  if (!response.ok) {
    const errObj = body as { error?: string; message?: string };
    return {
      ok: false,
      error: errObj?.error ?? errObj?.message ?? `Post-market failed (${response.status})`,
    };
  }

  return { ok: true, data: body as FinanceAiPostmarketAnalysis };
}

export async function getPostmarketStats(): Promise<
  { ok: true; data: FinanceAiPostmarketStats } | { ok: false; error: string }
> {
  const result = await financeAiFetch<FinanceAiPostmarketStats>("/context/postmarket/stats");
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, data: result.data };
}

export async function getNowPollingStatus(): Promise<
  { ok: true; data: import("@/lib/finance-ai-types").FinanceAiNowPollingStatus } | { ok: false; error: string }
> {
  const result = await financeAiFetch<import("@/lib/finance-ai-types").FinanceAiNowPollingStatus>(
    "/context/now/polling-status"
  );
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, data: result.data };
}

export async function getRecentAlerts(limit = 30): Promise<
  | { ok: true; data: import("@/lib/finance-ai-types").FinanceAiRecentAlertsStatus }
  | { ok: false; error: string }
> {
  const result = await financeAiFetch<import("@/lib/finance-ai-types").FinanceAiRecentAlertsStatus>(
    `/context/alerts/recent?limit=${limit}`
  );
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, data: result.data };
}

export async function getAlertsSettings(): Promise<
  | { ok: true; data: import("@/lib/finance-ai-types").FinanceAiAlertsSettings }
  | { ok: false; error: string }
> {
  const result = await financeAiFetch<import("@/lib/finance-ai-types").FinanceAiAlertsSettings>(
    "/context/alerts/settings"
  );
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, data: result.data };
}

export async function putAlertsSettings(enabled: boolean): Promise<
  | { ok: true; data: import("@/lib/finance-ai-types").FinanceAiAlertsSettings }
  | { ok: false; error: string }
> {
  const result = await financeAiFetch<import("@/lib/finance-ai-types").FinanceAiAlertsSettings>(
    "/context/alerts/settings",
    {
      method: "PUT",
      body: JSON.stringify({ alertsEnabled: enabled }),
    }
  );
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, data: result.data };
}

const MOV15M_STATUS_PATH = "/context/mov15m/status";

const MOV15M_TICK_POLL_MS = 2_000;
const MOV15M_TICK_POLL_MAX_MS = 900_000;

function mov15mPhaseMatchesPoll(expectedPhase: string | undefined, phase: string | undefined): boolean {
  if (!expectedPhase) return true;
  if (!phase) return false;
  if (phase === expectedPhase) return true;
  if (expectedPhase === "full_assessment" && phase.startsWith("full_assessment")) return true;
  if (
    expectedPhase === "full_assessment_inside_b15m" &&
    (phase === "session_complete" || phase.startsWith("full_assessment"))
  ) {
    return true;
  }
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getMov15mStatus(): Promise<
  | { ok: true; data: import("@/lib/finance-ai-types").FinanceAiBolinger15FastMovementStatus }
  | { ok: false; error: string }
> {
  const result = await financeAiStockAuxFetch<
    import("@/lib/finance-ai-types").FinanceAiBolinger15FastMovementStatus
  >(MOV15M_STATUS_PATH);
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, data: result.data };
}

export async function getMov15mStatusSummary(): Promise<
  | {
      ok: true;
      data: Pick<
        import("@/lib/finance-ai-types").FinanceAiBolinger15FastMovementStatus,
        "lastRunAt" | "lastRunPhase" | "phase" | "updatedAt" | "tradeDate" | "jobId"
      >;
    }
  | { ok: false; error: string }
> {
  const result = await financeAiStockAuxFetch<
    Pick<
      import("@/lib/finance-ai-types").FinanceAiBolinger15FastMovementStatus,
      "lastRunAt" | "lastRunPhase" | "phase" | "updatedAt" | "tradeDate" | "jobId"
    >
  >(`${MOV15M_STATUS_PATH}?summary=1`);
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, data: result.data };
}

export async function postMov15mTick(payload?: {
  force?: boolean;
  fresh?: boolean;
  async?: boolean;
  manual?: boolean;
  poll1m?: boolean;
  pollingStartTimeEt?: string;
  pollingEndTimeEt?: string;
  pollingStartMinutesEt?: number;
  pollingEndMinutesEt?: number;
  tickersForPolling?: string[];
  mode?: "auto" | "full_assessment" | "full_assessment_inside_b15m" | "premarket_now" | "in_market_now" | "post_market_now" | "opening_poll" | "validation_10am" | "precheck_928";
  tradeDate?: string;
  simulateMinutesEt?: number;
  symbols?: string[];
}): Promise<
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; error: string }
> {
  const result = await financeAiStockAuxFetch<Record<string, unknown>>(
    MOV15M_STATUS_PATH,
    {
      method: "POST",
      body: JSON.stringify({ force: true, mode: "full_assessment_inside_b15m", ...payload }),
    }
  );
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, data: result.data };
}

/** Poll GET status until async mov15m tick finishes (lastRunAt advances). */
export async function waitForMov15mTickComplete(
  baselineLastRunAt: string | undefined,
  options?: { expectedPhase?: string; maxMs?: number }
): Promise<
  | { ok: true; data: import("@/lib/finance-ai-types").FinanceAiBolinger15FastMovementStatus }
  | { ok: false; error: string }
> {
  const deadline = Date.now() + (options?.maxMs ?? MOV15M_TICK_POLL_MAX_MS);
  const expectedPhase = options?.expectedPhase;

  while (Date.now() < deadline) {
    await sleep(MOV15M_TICK_POLL_MS);
    const snap = await getMov15mStatus();
    if (!snap.ok) continue;
    const data = snap.data;
    const lastRunAt = data.lastRunAt;
    const phase = data.lastRunPhase ?? data.phase;
    if (lastRunAt && lastRunAt !== baselineLastRunAt) {
      if (mov15mPhaseMatchesPoll(expectedPhase, phase)) {
        return { ok: true, data };
      }
    }
  }

  return {
    ok: false,
    error:
      "mov15m evaluation timed out — Schwab fetch can take several minutes. Refresh status or retry.",
  };
}

export async function getStrategyMetStatus(): Promise<
  { ok: true; data: import("@/lib/finance-ai-types").FinanceAiStrategyMetStatus } | { ok: false; error: string }
> {
  const result = await financeAiFetch<import("@/lib/finance-ai-types").FinanceAiStrategyMetStatus>(
    "/context/now/strategy-met"
  );
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, data: result.data };
}

export async function runNowAssessment(symbol: string): Promise<
  | { ok: true; data: FinanceAiPremarketAnalysis }
  | { ok: false; error: string }
> {
  const { baseUrl, apiKey } = getConfig();
  const url = `${baseUrl}/tickers/${encodeURIComponent(symbol)}/now`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey },
      body: JSON.stringify({ profile: "open_all" }),
      cache: "no-store",
      signal: AbortSignal.timeout(PREMARKET_FETCH_MS),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Network error";
    logFinanceAiRequest("POST", url, 0, { error: message });
    return { ok: false, error: message };
  }

  const text = await response.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { error: text.slice(0, 500) };
    }
  }

  logFinanceAiRequest("POST", url, response.status, body);

  if (!response.ok) {
    const errObj = body as { error?: string; message?: string };
    return {
      ok: false,
      error: errObj?.error ?? errObj?.message ?? `NOW intake failed (${response.status})`,
    };
  }

  const payload = body as { result?: FinanceAiPremarketAnalysis; success?: boolean };
  const analysis = payload.result ?? (body as FinanceAiPremarketAnalysis);
  return { ok: true, data: analysis };
}

export type FinanceAiNowIntakeBatchResult = {
  success?: boolean;
  tradeDate?: string;
  symbols?: string[];
  successCount?: number;
  total?: number;
  tickersNow?: boolean;
  error?: string;
  results?: unknown[];
};

export async function manualPrecheckTickersNow(options?: {
  symbols?: string[];
  tradeDate?: string;
  force?: boolean;
  skipPipelineEval?: boolean;
}): Promise<
  { ok: true; data: FinanceAiTickersNow } | { ok: false; error: string }
> {
  const result = await financeAiFetch<{
    success?: boolean;
    tickersNow?: FinanceAiTickersNow;
    message?: string;
    reason?: string;
  }>(
    "/context/market-calendar/refresh",
    {
      method: "POST",
      body: JSON.stringify({
        job: "tickers_now_precheck",
        symbols: options?.symbols,
        tradeDate: options?.tradeDate,
        force: options?.force,
        skipPipelineEval: options?.skipPipelineEval,
      }),
    },
    getCalendarConfig()
  );
  if (!result.ok) return { ok: false, error: result.error };
  if (!result.data.success) {
    return {
      ok: false,
      error: result.data.message ?? result.data.reason ?? "Precheck TickersToday falló",
    };
  }
  const payload = result.data.tickersNow ?? result.data;
  return { ok: true, data: payload as FinanceAiTickersNow };
}

export async function recomputeTickersNow(options?: {
  symbols?: string[];
  tradeDate?: string;
  source?: string;
}): Promise<
  { ok: true; data: FinanceAiTickersNow } | { ok: false; error: string }
> {
  const job =
    options?.source === "premarket_assessment" ? "tickers_now_from_premarket" : "tickers_now";
  const result = await financeAiFetch<{ success?: boolean; tickersNow?: FinanceAiTickersNow }>(
    "/context/market-calendar/refresh",
    {
      method: "POST",
      body: JSON.stringify({
        job,
        symbols: options?.symbols,
        tradeDate: options?.tradeDate,
        source: options?.source,
      }),
    },
    getCalendarConfig()
  );
  if (!result.ok) return { ok: false, error: result.error };
  const payload = result.data.tickersNow ?? result.data;
  return { ok: true, data: payload as FinanceAiTickersNow };
}

export async function runNowIntakeBatch(
  symbols?: string[],
  options?: { manualIntake?: boolean; source?: string }
): Promise<
  { ok: true; data: FinanceAiNowIntakeBatchResult } | { ok: false; error: string }
> {
  const manualIntake = options?.manualIntake !== false;
  const source = options?.source ?? (manualIntake ? "journey_manual" : "adhoc");
  const result = await financeAiFetch<FinanceAiNowIntakeBatchResult>(
    "/context/market-calendar/refresh",
    {
      method: "POST",
      body: JSON.stringify({
        job: "now_intake",
        symbols: symbols?.length ? symbols : undefined,
        manualIntake,
        source,
      }),
    },
    getCalendarConfig()
  );
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, data: result.data };
}

export async function enrollNow(symbol: string, enabled: boolean): Promise<
  { ok: true; data: Record<string, unknown> } | { ok: false; error: string }
> {
  const { baseUrl, apiKey } = getConfig();
  const url = `${baseUrl}/tickers/${encodeURIComponent(symbol)}/now/enroll`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey },
      body: JSON.stringify({ enabled }),
      cache: "no-store",
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Network error" };
  }
  const text = await response.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { error: text.slice(0, 500) };
    }
  }
  if (!response.ok) {
    const errObj = body as { error?: string };
    return { ok: false, error: errObj?.error ?? `Enroll failed (${response.status})` };
  }
  return { ok: true, data: (body ?? {}) as Record<string, unknown> };
}

export async function runNowAiAssessment(symbol: string): Promise<
  | { ok: true; data: import("@/lib/finance-ai-types").FinanceAiPremarketAnalysis }
  | { ok: false; error: string }
> {
  const { baseUrl, apiKey } = getConfig();
  const url = `${baseUrl}/tickers/${encodeURIComponent(symbol)}/now/ai-assessment`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey },
      cache: "no-store",
      signal: AbortSignal.timeout(PREMARKET_FETCH_MS),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Network error";
    logFinanceAiRequest("POST", url, 0, { error: message });
    return { ok: false, error: message };
  }
  const text = await response.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { error: text.slice(0, 500) };
    }
  }
  logFinanceAiRequest("POST", url, response.status, body);
  if (!response.ok) {
    const errObj = body as { error?: string };
    return { ok: false, error: errObj?.error ?? `NOW AI failed (${response.status})` };
  }
  const data = body as { result?: import("@/lib/finance-ai-types").FinanceAiPremarketAnalysis };
  return {
    ok: true,
    data: (data.result ?? data) as import("@/lib/finance-ai-types").FinanceAiPremarketAnalysis,
  };
}

export type FinanceAiDailyMaintenanceTickerResult = {
  symbol: string;
  outcome: "success" | "error" | "skipped";
  reason?: string;
  error?: string;
  dailyBars?: number;
  hourlyBars?: number;
  min15Bars?: number;
};

export type FinanceAiDailyMaintenanceResult = {
  tradeDate?: string;
  phase?: string;
  startedAt?: string;
  updatedAt?: string;
  finishedAt?: string | null;
  intakeStopped?: boolean;
  intakeStopReason?: string | null;
  intakeStopMessage?: string | null;
  barGroups?: Record<string, string[]>;
  successSymbols?: string[];
  failedSymbols?: string[];
  skippedSymbols?: string[];
  errorSymbols?: string[];
  successCount?: number;
  failedCount?: number;
  skippedCount?: number;
  errorCount?: number;
  groups?: Record<
    string,
    {
      success?: FinanceAiDailyMaintenanceTickerResult[];
      error?: FinanceAiDailyMaintenanceTickerResult[];
      skipped?: FinanceAiDailyMaintenanceTickerResult[];
    }
  >;
  pre930Readiness?: {
    tradeDate?: string;
    ready?: boolean;
    dataReady?: boolean;
    poolReady?: boolean;
    checkedAt?: string;
    summary?: string;
    notReadySymbols?: string[];
    globalIssues?: { code?: string; message?: string; detail?: string }[];
    symbolCount?: number;
    readyCount?: number;
    tickersToday15MPreview?: {
      symbols?: string[];
      count?: number;
      criteria?: string;
      minPassPct?: number;
    };
    source?: string;
    window?: string;
  };
  pipelineEval?: {
    successCount?: number;
    total?: number;
    foundationCount?: number | null;
    mode?: string;
  };
  tickersToday15M?: {
    tradeDate?: string;
    symbols?: string[];
    count?: number;
    criteria?: string;
    minPassPct?: number;
  };
};

export type FinanceAiDailyMaintenanceStatus = {
  lastRunAt?: string | null;
  lastRunSource?: string | null;
  lastRunStatus?: string | null;
  lastRunTradeDate?: string | null;
  lastRunStartedAt?: string | null;
  lastRunFinishedAt?: string | null;
  lastRunSkipped?: boolean;
  lastRunSkipReason?: string | null;
  lastRunSymbolCount?: number | null;
  lastRunOk?: number | null;
  lastRunSkippedSymbols?: number | null;
  lastRunFailed?: number | null;
  lastRunPhase?: string | null;
  lastRunIntakeStopped?: boolean;
  lastRunMessage?: string | null;
  updatedAt?: string | null;
};

export type FinanceAiNoTradingDayEntry = {
  date: string;
  label?: string | null;
};

export type FinanceAiScheduleSettings = {
  scheduledJobsEnabled: boolean;
  alertsEnabled?: boolean;
  buySellEnabled?: boolean;
  buySellTickers?: string[];
  buySellTickersSource?: string | null;
  watchlist: string[];
  watchlistSource?: string | null;
  watchlistFallback?: string[];
  bolinger15Tickers?: string[];
  bolinger15TickersFallback?: string[];
  bolinger15TickersSource?: string | null;
  evaluateStrategyIds?: string[] | null;
  evaluateStrategyIdsEffective?: string[];
  evaluateStrategyIdsSource?: string | null;
  /** Full-day equity closures (YYYY-MM-DD ET). */
  noTradingDays?: FinanceAiNoTradingDayEntry[];
  noTradingDaysEffective?: string[];
  noTradingDaysSource?: string | null;
  nowGroups?: FinanceAiNowGroupsPayload | null;
  dailyMaintenance?: FinanceAiDailyMaintenanceStatus | null;
  tickersNow?: FinanceAiTickersNow | null;
  rules?: { name: string; state: string; error?: string }[];
  updatedAt?: string | null;
};

export type FinanceAiNowGroupConfig = {
  enabled?: boolean;
  intervalMin?: number;
  symbols?: string[];
  windowStartEt?: string;
  windowEndEt?: string;
};

export type FinanceAiNowGroupsPayload = {
  windowStartEt?: string;
  windowEndEt?: string;
  minutesEt?: number;
  pollingWindowActive?: boolean;
  activeGroups?: string[];
  groups?: Record<string, FinanceAiNowGroupConfig>;
  groupLabels?: Record<string, string>;
  updatedAt?: string | null;
};

export async function getDailyMaintenanceDetail(): Promise<
  | {
      ok: true;
      data: {
        dailyMaintenance: FinanceAiDailyMaintenanceStatus;
        result: FinanceAiDailyMaintenanceResult | null;
      };
    }
  | { ok: false; error: string }
> {
  const parseBarsResult = (data: {
    success?: boolean;
    barRequest?: FinanceAiDailyMaintenanceStatus;
    result?: FinanceAiDailyMaintenanceResult | null;
  }) => ({
    ok: true as const,
    data: {
      dailyMaintenance: data.barRequest ?? {},
      result: data.result ?? null,
    },
  });

  const primary = await financeAiFetch<{
    success?: boolean;
    barRequest?: FinanceAiDailyMaintenanceStatus;
    result?: FinanceAiDailyMaintenanceResult | null;
  }>("/bars/result");

  if (primary.ok) {
    return parseBarsResult(primary.data);
  }

  if (primary.status !== 404) {
    return { ok: false, error: primary.error };
  }

  const legacy = await financeAiIntakeFetch<{
    success?: boolean;
    barRequest?: FinanceAiDailyMaintenanceStatus;
    result?: FinanceAiDailyMaintenanceResult | null;
  }>("/context/intake/bar-request/result");
  if (!legacy.ok) {
    const lowered = String(legacy.error || "").toLowerCase();
    if (legacy.status === 404 || lowered.includes("no bar")) {
      const schedules = await getScheduleSettings();
      if (schedules.ok) {
        return {
          ok: true,
          data: {
            dailyMaintenance: schedules.data.dailyMaintenance ?? {},
            result: null,
          },
        };
      }
    }
    return { ok: false, error: legacy.error };
  }
  return parseBarsResult(legacy.data);
}

const STRATEGY_EVAL_FETCH_MS = 900_000;

export type FinanceAiStrategyEvalTickerResult = {
  symbol: string;
  success: boolean;
  error?: string;
  analysis?: FinanceAiPremarketAnalysis;
  /** Compact row from batch strategy-eval when full analysis is omitted. */
  persisted?: boolean;
  strategyCount?: number;
  bestProbabilityPct?: number;
};

export type FinanceAiStrategyEvalResult = {
  success?: boolean;
  status?: "running" | "complete" | "error" | string;
  tradeDate?: string;
  simulationTimeEt?: string;
  evaluatedAt?: string;
  updatedAt?: string | null;
  summary?: { total?: number; ok?: number; failed?: number };
  barRequest?: {
    ran?: boolean;
    successCount?: number;
    failedSymbols?: string[];
  };
  results?: FinanceAiStrategyEvalTickerResult[];
  error?: string;
};

function strategyEvalFinished(data: FinanceAiStrategyEvalResult | null | undefined): boolean {
  if (!data) return false;
  if (data.status === "complete" || data.status === "error") return true;
  if (data.status === "running") return false;
  if (Array.isArray(data.results) && data.results.length > 0) return true;
  return data.success === true && data.status !== "running";
}

function parseStrategyEvalResponse(parsed: Record<string, unknown>): FinanceAiStrategyEvalResult | null {
  return (
    (parsed.tickersCheck as FinanceAiStrategyEvalResult | undefined) ??
    (parsed.strategyEval as FinanceAiStrategyEvalResult | undefined) ??
    (parsed.result as FinanceAiStrategyEvalResult | undefined) ??
    null
  );
}

async function fetchFinanceAiJson(
  method: "GET" | "POST",
  url: string,
  options?: { body?: Record<string, unknown>; timeoutMs?: number }
): Promise<{ response: Response; parsed: Record<string, unknown> }> {
  const { apiKey } = getConfig();
  const headers: Record<string, string> = { "x-api-key": apiKey };
  const init: RequestInit = {
    method,
    headers,
    cache: "no-store",
    signal: AbortSignal.timeout(options?.timeoutMs ?? 60_000),
  };
  if (options?.body) {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(options.body);
  }

  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Network error";
    logFinanceAiRequest(method, url, 0, { error: message });
    throw e;
  }

  const text = await response.text();
  let parsed: Record<string, unknown> = {};
  if (text) {
    try {
      parsed = JSON.parse(text) as Record<string, unknown>;
    } catch {
      parsed = { error: text.slice(0, 500) };
    }
  }
  logFinanceAiRequest(method, url, response.status, parsed);
  return { response, parsed };
}

/** Sync batch ticker assessment — POST /tickers/check. */
export async function runStrategyEvalCheck(options: {
  symbols: string[];
  strategies: string[];
  tradeDate?: string;
  simulationTimeEt?: string;
  skipBars?: boolean;
  saveTickersNow?: boolean;
}): Promise<
  | { ok: true; data: FinanceAiStrategyEvalResult }
  | { ok: false; status: number; error: string; notFound?: boolean }
> {
  const { baseUrl } = getConfig();
  const url = `${baseUrl}/tickers/check`;
  const payload: Record<string, unknown> = {
    symbols: options.symbols,
    strategies: options.strategies,
    skipBars: options.skipBars ?? false,
    saveTickersNow: options.saveTickersNow ?? false,
  };
  if (options.tradeDate?.trim()) payload.tradeDate = options.tradeDate.trim();
  if (options.simulationTimeEt?.trim()) payload.simulationTimeEt = options.simulationTimeEt.trim();

  try {
    const { response, parsed } = await fetchFinanceAiJson("POST", url, {
      body: payload,
      timeoutMs: STRATEGY_EVAL_FETCH_MS,
    });

    if (response.status === 404) {
      return {
        ok: false,
        status: 404,
        notFound: true,
        error: String(parsed.error ?? "POST /tickers/check not deployed"),
      };
    }

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error: String(parsed.error ?? parsed.message ?? `Tickers check failed (${response.status})`),
      };
    }

    const data = parseStrategyEvalResponse(parsed);
    if (!data) {
      return { ok: false, status: 500, error: "Tickers check response missing payload" };
    }
    if (data.status === "error" || data.success === false) {
      return {
        ok: false,
        status: 502,
        error: data.error ?? "Tickers check falló",
      };
    }
    return { ok: true, data };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Network error";
    return { ok: false, status: 0, error: message };
  }
}

export async function getStrategyEvalResult(): Promise<
  | { ok: true; data: FinanceAiStrategyEvalResult | null }
  | { ok: false; status: number; error: string; notFound?: boolean }
> {
  const { baseUrl } = getConfig();
  const url = `${baseUrl}/tickers/check/result`;

  try {
    const { response, parsed } = await fetchFinanceAiJson("GET", url);

    if (response.status === 404) {
      return {
        ok: false,
        status: 404,
        error: String(parsed.error ?? "No tickers check result"),
        notFound: true,
      };
    }
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error: String(parsed.error ?? "Tickers check result failed"),
      };
    }

    const payload = parseStrategyEvalResponse(parsed);
    if (!payload && parsed.success === false) {
      return { ok: true, data: null };
    }
    return { ok: true, data: payload };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Network error";
    return { ok: false, status: 0, error: message };
  }
}

export async function triggerStrategyEvalFlow(options: {
  symbols: string[];
  strategies: string[];
  tradeDate?: string;
  simulationTimeEt?: string;
  fresh?: boolean;
  skipBars?: boolean;
}): Promise<
  | { ok: true; accepted: boolean; data: FinanceAiStrategyEvalResult }
  | { ok: false; status: number; error: string; notFound?: boolean }
> {
  const result = await runStrategyEvalCheck({
    symbols: options.symbols,
    strategies: options.strategies,
    tradeDate: options.tradeDate,
    simulationTimeEt: options.simulationTimeEt,
    skipBars: options.skipBars,
  });
  if (!result.ok) return result;
  return { ok: true, accepted: false, data: result.data };
}

/** POST /tickers/check — sync batch assessment. */
export async function triggerStrategyEvalStart(options: {
  symbols: string[];
  strategies: string[];
  tradeDate?: string;
  simulationTimeEt?: string;
  fresh?: boolean;
  skipBars?: boolean;
}): Promise<
  | { ok: true; accepted: boolean; data: FinanceAiStrategyEvalResult | null }
  | { ok: false; status: number; error: string; notFound?: boolean }
> {
  const result = await runStrategyEvalCheck({
    symbols: options.symbols,
    strategies: options.strategies,
    tradeDate: options.tradeDate,
    simulationTimeEt: options.simulationTimeEt,
    skipBars: options.skipBars,
  });
  if (!result.ok) return result;
  return { ok: true, accepted: false, data: result.data };
}

export async function getScheduleSettings(): Promise<
  { ok: true; data: FinanceAiScheduleSettings } | { ok: false; error: string }
> {
  const result = await financeAiStockAuxFetch<FinanceAiScheduleSettings>("/config/schedules");
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, data: result.data };
}

const DAILY_MAINTENANCE_FETCH_MS = 900_000;

export async function refreshDailyMaintenance(options?: {
  symbols?: string[];
  skipBb15?: boolean;
  skipPipelineEval?: boolean;
  resetBars?: boolean;
}): Promise<
  { ok: true; data: FinanceAiDailyMaintenanceStatus } | { ok: false; error: string }
> {
  const payload = {
    force: true,
    skipBb15: options?.skipBb15 ?? false,
    skipPipelineEval: options?.skipPipelineEval ?? false,
    resetBars: options?.resetBars ?? false,
    symbols: options?.symbols,
  };

  const before = await getScheduleSettings();
  const beforeUpdated = before.ok ? before.data.dailyMaintenance?.lastRunAt : null;
  const beforeStatus = before.ok ? before.data.dailyMaintenance?.lastRunStatus : null;

  async function postBarsRefresh(
    path: string,
    config: { baseUrl: string; apiKey: string }
  ): Promise<{ response: Response; parsed: unknown; url: string }> {
    const url = `${config.baseUrl}${path}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.apiKey,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: AbortSignal.timeout(DAILY_MAINTENANCE_FETCH_MS),
    });
    const text = await response.text();
    let parsed: unknown = null;
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = { error: text.slice(0, 500) };
      }
    }
    logFinanceAiRequest("POST", url, response.status, parsed);
    return { response, parsed, url };
  }

  let response: Response;
  let parsed: unknown;
  try {
    const primary = await postBarsRefresh("/bars/refresh", getConfig());
    response = primary.response;
    parsed = primary.parsed;
    if (response.status === 404) {
      const legacy = await postBarsRefresh(
        "/context/intake/bar-request/trigger",
        getIntakeConfig()
      );
      response = legacy.response;
      parsed = legacy.parsed;
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Network error";
    return { ok: false, error: message };
  }

  const pollUntilDone = async (): Promise<
    { ok: true; data: FinanceAiDailyMaintenanceStatus } | { ok: false; error: string }
  > => {
    for (let attempt = 0; attempt < 120; attempt += 1) {
      if (attempt > 0) {
        await new Promise((r) => setTimeout(r, 5000));
      }
      const poll = await getScheduleSettings();
      if (!poll.ok) continue;
      const status = poll.data.dailyMaintenance;
      if (!status?.lastRunAt) continue;
      const finished =
        status.lastRunStatus !== "running" &&
        (status.lastRunAt !== beforeUpdated || beforeStatus === "running");
      if (finished) {
        return { ok: true, data: status };
      }
    }
    const last = await getScheduleSettings();
    if (last.ok && last.data.dailyMaintenance) {
      const status = last.data.dailyMaintenance;
      if (status.lastRunStatus === "running") {
        return {
          ok: false,
          error:
            "La recolección sigue en curso en AWS — pulsa «Actualizar estado AWS» en unos minutos.",
        };
      }
      return { ok: true, data: status };
    }
    return {
      ok: false,
      error: "Timeout esperando recolección histórica — revisa AWS en unos minutos.",
    };
  };

  if (response.status === 202) {
    const accepted = parsed as {
      dailyMaintenance?: FinanceAiDailyMaintenanceStatus;
    };
    if (accepted.dailyMaintenance) {
      // running snapshot from POST — caller can show immediately
    }
    return pollUntilDone();
  }

  if (!response.ok) {
    const errObj = parsed as { error?: string; message?: string; Message?: string };
    const gatewayMsg = errObj?.message ?? errObj?.Message;
    return {
      ok: false,
      error:
        errObj?.error ??
        gatewayMsg ??
        (response.status === 403
          ? "403 Forbidden — ruta no desplegada en API Gateway o API key inválida."
          : `Daily maintenance failed (${response.status})`),
    };
  }

  const data = parsed as {
    success?: boolean;
    dailyMaintenance?: FinanceAiDailyMaintenanceStatus;
    result?: { dailyMaintenanceStatus?: FinanceAiDailyMaintenanceStatus };
  };
  const status =
    data.dailyMaintenance ??
    data.result?.dailyMaintenanceStatus;
  if (status) {
    return { ok: true, data: status };
  }
  return pollUntilDone();
}

export async function putScheduleSettings(payload: {
  scheduledJobsEnabled?: boolean;
  alertsEnabled?: boolean;
  buySellEnabled?: boolean;
  buySellTickers?: string[];
  buySellTickersSource?: string;
  symbols?: string[];
  watchlistSource?: string;
  bolinger15Tickers?: string[];
  bolinger15TickersSource?: string;
  evaluateStrategyIds?: string[];
  evaluateStrategyIdsSource?: string;
  noTradingDays?: FinanceAiNoTradingDayEntry[];
  noTradingDaysSource?: string;
  ruleName?: string;
  ruleEnabled?: boolean;
}): Promise<
  { ok: true; data: FinanceAiScheduleSettings & { success?: boolean } } | { ok: false; error: string }
> {
  const result = await financeAiStockAuxFetch<FinanceAiScheduleSettings & { success?: boolean }>(
    "/config/schedules",
    {
      method: "PUT",
      body: JSON.stringify(payload),
    }
  );
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, data: result.data };
}

const MOV15M_ORDER_PATH = "/context/mov15m/order";
const MOV15M_ORDERS_PATH = "/context/mov15m/orders";

export type FinanceAiTradingOrderResult = {
  success?: boolean;
  orderId?: string;
  dryRun?: boolean;
  fillPollActive?: boolean;
  fillPollIntervalSec?: number;
  message?: string;
  order?: {
    symbol?: string;
    side?: string;
    instruction?: string;
    optionType?: string;
    quantity?: number;
    assetType?: string;
    orderType?: string;
    session?: string;
    duration?: string;
    accountType?: string;
    expirationDate?: string;
    selectedAsk?: number;
    price?: number;
    fillPriceBasis?: number;
  };
  submittedAt?: string;
  bought?: boolean;
  fillPrice?: number | null;
  buyOrderId?: string;
  limitPrice?: number;
  fillPriceBasis?: number;
  cancelledLimitOrders?: Array<{
    orderId?: string;
    schwabOrderId?: string | null;
    cancelled?: boolean;
    limitPrice?: number;
    message?: string;
  }>;
  error?: string;
};

export type FinanceAiTradingOrderFillStatus = {
  found?: boolean;
  orderId?: string;
  symbol?: string;
  optionType?: string;
  side?: string;
  status?: string;
  bought?: boolean;
  fillPrice?: number | null;
  fillPollActive?: boolean;
  fillPollIntervalSec?: number;
  dryRun?: boolean;
  submittedAt?: string;
  filledAt?: string;
  message?: string;
};

export type FinanceAiTradingPositionStatus = {
  found?: boolean;
  buyOrderId?: string;
  sellOrderId?: string | null;
  symbol?: string;
  optionType?: string;
  optionSymbol?: string | null;
  strikePrice?: number | null;
  spotPrice?: number | null;
  entryPrice?: number | null;
  currentPrice?: number | null;
  currentBid?: number | null;
  currentAsk?: number | null;
  currentMark?: number | null;
  limitSellPrice?: number | null;
  sellOrderStatus?: string;
  sellFilled?: boolean;
  sellProgress?: string | null;
  distanceToLimit?: number | null;
  quantity?: number;
  unrealizedPnlPerShare?: number | null;
  unrealizedPnlTotal?: number | null;
  pnlDirection?: "profit" | "loss" | "flat" | "unknown" | string;
  quotesSource?: string;
  dryRun?: boolean;
  message?: string;
};

export async function getMov15mOrderStatus(
  buyOrderId: string,
  params?: { sellOrderId?: string; spotPrice?: number }
): Promise<
  { ok: true; data: FinanceAiTradingPositionStatus } | { ok: false; error: string }
> {
  const qs = new URLSearchParams();
  if (params?.sellOrderId) qs.set("sellOrderId", params.sellOrderId);
  if (params?.spotPrice != null && Number.isFinite(params.spotPrice)) {
    qs.set("spotPrice", String(params.spotPrice));
  }
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const result = await financeAiStockAuxFetch<FinanceAiTradingPositionStatus>(
    `${MOV15M_ORDER_PATH}/${encodeURIComponent(buyOrderId)}/status${suffix}`
  );
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, data: result.data };
}

export type FinanceAiTradingOrderSummary = {
  orderId?: string;
  symbol?: string;
  side?: string;
  optionType?: string;
  status?: string;
  orderType?: string;
  price?: number | null;
  fillPrice?: number | null;
  limitPrice?: number | null;
  buyOrderId?: string | null;
  bought?: boolean;
  fillPollActive?: boolean;
  submittedAt?: string | null;
  updatedAt?: string | null;
  cancelledAt?: string | null;
  cancelReason?: string | null;
  dryRun?: boolean;
  optionSymbol?: string | null;
  strikePrice?: number | null;
  cancellable?: boolean;
  editable?: boolean;
  message?: string | null;
};

export type FinanceAiTradingOrdersList = {
  symbol?: string;
  orders?: FinanceAiTradingOrderSummary[];
  count?: number;
};

export async function getMov15mOrdersBySymbol(symbol: string): Promise<
  { ok: true; data: FinanceAiTradingOrdersList } | { ok: false; error: string }
> {
  const qs = new URLSearchParams({ symbol: symbol.toUpperCase() });
  const result = await financeAiStockAuxFetch<FinanceAiTradingOrdersList>(
    `${MOV15M_ORDERS_PATH}?${qs.toString()}`
  );
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, data: result.data };
}

export async function cancelMov15mOrder(orderId: string): Promise<
  { ok: true; data: { success?: boolean; order?: FinanceAiTradingOrderSummary; message?: string } } | { ok: false; error: string }
> {
  const result = await financeAiStockAuxFetch<{ success?: boolean; order?: FinanceAiTradingOrderSummary; message?: string }>(
    `${MOV15M_ORDER_PATH}/${encodeURIComponent(orderId)}/cancel`,
    { method: "POST", body: JSON.stringify({}) }
  );
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, data: result.data };
}

export async function patchMov15mOrderLimit(
  orderId: string,
  price: number
): Promise<
  { ok: true; data: { success?: boolean; order?: FinanceAiTradingOrderSummary; message?: string } } | { ok: false; error: string }
> {
  const result = await financeAiStockAuxFetch<{ success?: boolean; order?: FinanceAiTradingOrderSummary; message?: string }>(
    `${MOV15M_ORDER_PATH}/${encodeURIComponent(orderId)}`,
    { method: "PATCH", body: JSON.stringify({ price }) }
  );
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, data: result.data };
}

export async function postMov15mTradingOrder(payload: {
  symbol: string;
  side: "buy" | "sell" | "sell_now" | "force_sell";
  optionType?: "CALL" | "PUT";
  direction?: string;
  quantity?: number;
  buyOrderId?: string;
}): Promise<
  { ok: true; data: FinanceAiTradingOrderResult } | { ok: false; error: string }
> {
  const result = await financeAiStockAuxFetch<FinanceAiTradingOrderResult>(MOV15M_ORDER_PATH, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, data: result.data };
}

export async function getMov15mOrderFill(orderId: string): Promise<
  { ok: true; data: FinanceAiTradingOrderFillStatus } | { ok: false; error: string }
> {
  const result = await financeAiStockAuxFetch<FinanceAiTradingOrderFillStatus>(
    `${MOV15M_ORDER_PATH}/${encodeURIComponent(orderId)}/fill`
  );
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, data: result.data };
}

export async function getNowGroups(): Promise<
  { ok: true; data: FinanceAiNowGroupsPayload } | { ok: false; error: string }
> {
  const result = await financeAiStockAuxFetch<FinanceAiNowGroupsPayload>("/config/now-groups");
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, data: result.data };
}

export async function putNowGroups(
  groups: Record<string, { enabled?: boolean; symbols: string[] }>
): Promise<
  { ok: true; data: FinanceAiNowGroupsPayload & { success?: boolean } } | { ok: false; error: string }
> {
  const result = await financeAiStockAuxFetch<FinanceAiNowGroupsPayload & { success?: boolean }>(
    "/config/now-groups",
    {
      method: "PUT",
      body: JSON.stringify({ groups }),
    }
  );
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, data: result.data };
}

export async function setTickerNowSchedule(
  symbol: string,
  enabled: boolean
): Promise<{ ok: true; data: Record<string, unknown> } | { ok: false; error: string }> {
  const { baseUrl, apiKey } = getConfig();
  const url = `${baseUrl}/tickers/${encodeURIComponent(symbol)}/now/schedule`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey },
      body: JSON.stringify({ enabled }),
      cache: "no-store",
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Network error";
    return { ok: false, error: message };
  }
  const text = await response.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { error: text.slice(0, 500) };
    }
  }
  if (!response.ok) {
    const errObj = body as { error?: string; message?: string };
    return {
      ok: false,
      error: errObj?.error ?? errObj?.message ?? `Schedule update failed (${response.status})`,
    };
  }
  return { ok: true, data: (body ?? {}) as Record<string, unknown> };
}
