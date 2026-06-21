# Market page � FinanceAI APIs reference

InvestJournal **Market** route: **`/market`** (sidebar ? **Market**).

This document lists every AWS / FinanceAI API used on the Market page **so far**, with parameters, server/client wiring, and the UI control that triggers each call.

Related docs:

| Doc | Purpose |
|-----|---------|
| [marketPage.md](./marketPage.md) | Page overview, panels, workflow |
| [marketPage-strategy-eval-api.md](./marketPage-strategy-eval-api.md) | Full AWS contract for strategy-eval batch (Option B) |

---

## Gateways and auth

All requests send header **`x-api-key: FINANCE_AI_API_KEY`**.

| Env var | Used for |
|---------|----------|
| `FINANCE_AI_API_URL` | Main API (ticker context, `/check`, etc.) |
| `FINANCE_AI_INTAKE_API_URL` | Intake jobs: bar-request, strategy-eval (falls back to main URL) |
| `FINANCE_AI_CALENDAR_API_URL` | Market calendar refresh (falls back to main URL) |

Client resolver: `src/server/services/finance-ai-client.ts` (`getConfig`, `getIntakeConfig`, `getCalendarConfig`).

---

## Quick index (Market page only)

| # | Method | Path | Gateway | Page / panel | UI control | Server action | Client function |
|---|--------|------|---------|--------------|------------|---------------|-----------------|
| 1 | `GET` | `/tickers/{symbol}/context` | Main | `/market` ? Ticker Context | **Consultar AWS** (all rows); auto after bar-request | `fetchFinanceAiTickerContext` ? `resolveFinanceAiTickerStatus` | `getTickerContext` |
| 2 | `GET` | `/context/intake/bar-request/result` | Intake | Ticker Context | Panel load (Recopilar banner + per-ticker bar outcome) | `fetchDailyMaintenanceForTickerPanel` | `getDailyMaintenanceDetail` |
| 3 | `GET` | `/config/schedules` | Stock aux | Ticker Context | Fallback when bar-request/result is 404 | (inside `fetchDailyMaintenanceForTickerPanel`) | `getScheduleSettings` |
| 4 | `POST` | `/context/intake/bar-request/trigger` | Intake | Ticker Context | **Actualizar barras**, **Reset barras**, row **Actualizar** | `triggerFinanceAiBarRequest` | `refreshDailyMaintenance` |
| 5 | `POST` | `/context/market-calendar/refresh` | Calendar | Ticker Context | **Request Earning Calendar** | `refreshFinanceAiMarketCalendar` | `refreshMarketCalendar` |
| 6 | `GET` | `/context/intake/strategy-eval/result` | Intake | Result Now | **Check Result**; on panel mount | `checkMarketNowEvaluation` | `getStrategyEvalResult` |
| 7 | `POST` | `/context/intake/strategy-eval/trigger` | Intake | Result Now | **Evaluate** | `startMarketNowEvaluation` | `triggerStrategyEvalStart` |
| 8 | `POST` | `/context/intake/bar-request/trigger` | Intake | Result Now | (inside **Evaluate** legacy fallback only) | `startMarketNowEvaluation` ? `runMarketNowEvaluationLegacy` | `refreshDailyMaintenance` |
| 9 | `POST` | `/tickers/{symbol}/check` | Main | Result Now | (inside **Evaluate** legacy fallback only, per ticker) | `startMarketNowEvaluation` ? `runMarketNowEvaluationLegacy` | `checkTicker` |

**Components**

| Panel | Component | Anchor id |
|-------|-----------|-----------|
| Ticker Context | `InicializarTickersPanel` | `journey-init-tickers` |
| Result Now | `MarketNowEvaluatePanel` | `journey-result-now` |

**Page shell:** `src/app/market/page.tsx` ? `MarketWorkspace` (`src/components/market/MarketWorkspace.tsx`).

Tickers source: `listTickersForTickerContext()` (MySQL catalog + persisted FinanceAI fields).

Evaluable strategies: `MARKET_AI_EVALUABLE_STRATEGIES` in `src/lib/market-ai-process-scope.ts` (defaults: `estrategia-01` � `estrategia-04`).

---

## 1. Ticker context

### `GET /tickers/{symbol}/context`

Read **TickerContext** from Dynamo (status, historical bars metadata, errors).

| Param | Source |
|-------|--------|
| `symbol` | Path � each catalog ticker |

**Where used**

| Control | Behavior |
|---------|----------|
| **Consultar AWS** | Loops all tickers; updates **Ctx:** badge (`ready` / `missing` / `error` / �) |
| After **Actualizar barras** / row **Actualizar** | Refreshes row state and optionally persists to MySQL |

**Code:** `getTickerContext` ? `fetchFinanceAiTickerContext` ? `resolveFinanceAiTickerStatus`  
**File:** `src/lib/finance-ai-ticker-status.ts`, `InicializarTickersPanel.tsx`

---

## 2. Bar-request (intake)

### `POST /context/intake/bar-request/trigger`

Fetch / refresh D + 1h + 15m bars for symbols. Market Ticker Context always skips BB15 and pipeline eval.

**Request body**

```json
{
  "force": true,
  "skipBb15": true,
  "skipPipelineEval": true,
  "resetBars": false,
  "symbols": ["AAPL", "MSFT"]
}
```

| Field | Ticker Context UI | Result Now UI |
|-------|-------------------|---------------|
| `force` | always `true` | same (via strategy-eval or legacy) |
| `skipBb15` | always `true` | always `true` |
| `skipPipelineEval` | always `true` | always `true` |
| `resetBars` | `false` = **Actualizar barras** / row **Actualizar**; `true` = **Reset barras** | `false` (legacy fallback only) |
| `symbols` | All catalog tickers or single row symbol | Selected ticker checkboxes (legacy path) |

**Where used � Ticker Context**

| Control | `resetBars` | `symbols` |
|---------|-------------|-----------|
| **Actualizar barras** | `false` | all catalog tickers |
| **Reset barras** | `true` | all catalog tickers |
| Row **Actualizar** | `false` | `[symbol]` |

**Server action:** `triggerFinanceAiBarRequest(symbols?, { resetBars? })`  
**Client:** `refreshDailyMaintenance` in `finance-ai-client.ts`

---

### `GET /context/intake/bar-request/result`

Last bar-request job outcome (GlobalContext `dailyMaintenanceResult`).

**Where used**

| When | UI |
|------|-----|
| Panel mount | Recopilar alert banner + per-ticker bar outcome chip (OK / fail / skipped) |

**Server action:** `fetchDailyMaintenanceForTickerPanel`  
**Client:** `getDailyMaintenanceDetail`

**Fallback:** if 404, reads `dailyMaintenance` from `GET /config/schedules`.

---

## 3. Market calendar

### `POST /context/market-calendar/refresh`

Refresh earnings + FOMC calendar for configured symbols.

**Request body**

```json
{
  "symbols": ["AAPL", "MSFT"],
  "force": false
}
```

| Field | Source |
|-------|--------|
| `symbols` | `listCalendarRefreshSymbols()` � tickers flagged for calendar in Config |
| `force` | omitted / false from Market panel |

**Where used**

| Control | Panel |
|---------|-------|
| **Request Earning Calendar** | Ticker Context |

**Server action:** `refreshFinanceAiMarketCalendar`  
**Client:** `refreshMarketCalendar`

---

## 4. Strategy eval batch (Result Now)

Preferred path for **Result Now**. Full AWS contract: [marketPage-strategy-eval-api.md](./marketPage-strategy-eval-api.md).

### `POST /context/intake/strategy-eval/trigger`

Start async (or sync small batch) multi-ticker strategy evaluation.

**Request body**

```json
{
  "symbols": ["AAPL", "MSFT"],
  "strategies": ["estrategia-01", "estrategia-03"],
  "tradeDate": "2026-06-19",
  "simulationTimeEt": "10:15",
  "fresh": true,
  "skipBars": false
}
```

| Field | Result Now UI control |
|-------|------------------------|
| `symbols` | **Tickers** checkboxes (collapsible list) |
| `strategies` | **Estrategias a evaluar** checkboxes |
| `tradeDate` | **Now** ? today ET; **Fecha y hora** ? date input |
| `simulationTimeEt` | **Now** ? omitted; **Fecha y hora** ? time input (`HH:mm` ET) |
| `fresh` | always `true` |
| `skipBars` | **Omitir actualizaci�n de barras** ? `true`; unchecked ? `false` (runs incremental bar-request first) |

**Where used**

| Control | Behavior |
|---------|----------|
| **Evaluate** | POST only; does **not** poll. Status ? **In progress** on 202 / `running`. |

**Server action:** `startMarketNowEvaluation`  
**Client:** `triggerStrategyEvalStart` (no poll)

**Legacy (404 on trigger):** synchronous `bar-request` + N � `POST /tickers/{symbol}/check`; status ? **Done at** when finished.

---

### `GET /context/intake/strategy-eval/result`

Read last strategy-eval job state and per-ticker results.

**Where used**

| Control | Behavior |
|---------|----------|
| **Check Result** | GET only; filters `results[]` to selected tickers + strategies |
| Panel mount | Restores last AWS state if any |

**Status mapping (UI badge)**

| AWS `status` | Badge |
|--------------|-------|
| `running` | **In progress** |
| `complete` | **Done at** `{evaluatedAt \| updatedAt}` (formatted ET) |
| (no job / empty) | no badge; hint to use **Evaluate** |

**Server action:** `checkMarketNowEvaluation`  
**Client:** `getStrategyEvalResult`

Response key: `strategyEval` or `result` (client accepts both).

---

## 5. Per-ticker check (legacy fallback)

### `POST /tickers/{symbol}/check`

Single-ticker strategy checklist (same `analysis` shape as strategy-eval `results[].analysis`).

**Request body (legacy path)**

```json
{
  "strategies": ["estrategia-01"],
  "tradeDate": "2026-06-19",
  "simulationTimeEt": "10:15",
  "fresh": true
}
```

| Field | Result Now UI |
|-------|---------------|
| `strategies` | Selected strategy checkboxes |
| `tradeDate` | From eval moment (Now / Fecha y hora) |
| `simulationTimeEt` | Only when **Fecha y hora** |
| `fresh` | `true` |

**Where used:** only when strategy-eval trigger returns **404** � **Evaluate** runs one request per selected ticker.

**Client:** `checkTicker` in `finance-ai-client.ts`

---

## End-to-end flows

### Ticker Context � refresh bars

```
User: Actualizar barras
  ? triggerFinanceAiBarRequest
  ? POST /context/intake/bar-request/trigger
  ? GET /tickers/{symbol}/context (each symbol)
  ? GET /context/intake/bar-request/result (reload banner)
```

### Result Now � batch (Option B)

```
User: Evaluate
  ? startMarketNowEvaluation
  ? POST /context/intake/strategy-eval/trigger
  ? UI: In progress

User: Check Result (repeat while running)
  ? checkMarketNowEvaluation
  ? GET /context/intake/strategy-eval/result
  ? UI: In progress | Done at � + checklist per ticker
```

### Result Now � legacy (strategy-eval not deployed)

```
User: Evaluate
  ? startMarketNowEvaluation (404 on trigger)
  ? POST /context/intake/bar-request/trigger  (unless skipBars)
  ? POST /tickers/{symbol}/check  (each selected ticker)
  ? UI: Done at � (immediate, sync)
```

---

## Code map

| Layer | Path |
|-------|------|
| Page | `src/app/market/page.tsx` |
| Workspace | `src/components/market/MarketWorkspace.tsx` |
| Ticker Context UI | `src/components/gestion/InicializarTickersPanel.tsx` |
| Result Now UI | `src/components/market/MarketNowEvaluatePanel.tsx` |
| Server actions | `src/server/actions/finance-ai.ts` |
| HTTP client | `src/server/services/finance-ai-client.ts` |
| Evaluable strategy ids | `src/lib/market-ai-process-scope.ts` |

### Server actions (Market-relevant)

| Action | APIs |
|--------|------|
| `fetchFinanceAiTickerContext` | GET context |
| `fetchDailyMaintenanceForTickerPanel` | GET bar-request/result (+ schedules fallback) |
| `triggerFinanceAiBarRequest` | POST bar-request/trigger |
| `refreshFinanceAiMarketCalendar` | POST market-calendar/refresh |
| `checkMarketNowEvaluation` | GET strategy-eval/result |
| `startMarketNowEvaluation` | POST strategy-eval/trigger (+ legacy bar-request + check) |
| `runMarketNowEvaluation` | (deprecated for UI) full trigger + poll or legacy � kept for compatibility |

### Client functions (Market-relevant)

| Function | API |
|----------|-----|
| `getTickerContext` | GET `/tickers/{symbol}/context` |
| `getDailyMaintenanceDetail` | GET `/context/intake/bar-request/result` |
| `refreshDailyMaintenance` | POST `/context/intake/bar-request/trigger` |
| `refreshMarketCalendar` | POST `/context/market-calendar/refresh` |
| `getStrategyEvalResult` | GET `/context/intake/strategy-eval/result` |
| `triggerStrategyEvalStart` | POST `/context/intake/strategy-eval/trigger` (no poll) |
| `triggerStrategyEvalFlow` | POST trigger + poll (not used by Market UI) |
| `checkTicker` | POST `/tickers/{symbol}/check` |

---

## Not on Market page (related elsewhere)

These intake APIs exist in the same client but are used from **Gesti�n** or scheduled flows, not `/market`:

| API | Typical use |
|-----|-------------|
| `POST /context/intake/pre-premarket-flow/trigger` | Gesti�n � Pre-PRE journey |
| `GET /context/intake/pre-premarket-flow/result` | Gesti�n |
| `POST /context/intake/market-start-flow/trigger` | Gesti�n � Premarket / market start |
| `GET /context/intake/market-start-flow/result` | Gesti�n |

See `MARKET_AI_PROCESS_SCOPES` in `src/lib/market-ai-process-scope.ts`.
