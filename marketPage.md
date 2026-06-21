# Market page (`/market`)

Route: **`/market`** � sidebar **Market**.

**Panels:** [Ticker Context](#panel-ticker-context) � [Result Now](#panel-result-now)

**API reference (params, controls, code):** [marketPage-apis.md](./marketPage-apis.md)  
**Strategy-eval AWS contract:** [marketPage-strategy-eval-api.md](./marketPage-strategy-eval-api.md)

---

## Panel: Ticker Context

**Component:** `InicializarTickersPanel` � **Anchor:** `journey-init-tickers`

| Control | API | Doc |
|---------|-----|-----|
| Consultar AWS | `GET /tickers/{symbol}/context` | [�1](./marketPage-apis.md#1-ticker-context) |
| Request Earning Calendar | `POST /context/market-calendar/refresh` | [�3](./marketPage-apis.md#3-market-calendar) |
| Actualizar barras | `POST /context/intake/bar-request/trigger` (`resetBars: false`) | [�2](./marketPage-apis.md#2-bar-request-intake) |
| Reset barras | same (`resetBars: true`) | [�2](./marketPage-apis.md#2-bar-request-intake) |
| Row **Actualizar** | bar-request incremental for one symbol | [�2](./marketPage-apis.md#2-bar-request-intake) |
| (on load) | `GET /context/intake/bar-request/result` | [�2](./marketPage-apis.md#get-contextintakebar-requestresult) |

---

## Panel: Result Now

**Component:** `MarketNowEvaluatePanel` � **Anchor:** `journey-result-now`

### Controls

| Control | Action | API |
|---------|--------|-----|
| **Tickers** checkboxes | scope | `symbols` in trigger / filter on result |
| **Estrategias** checkboxes | scope | `strategies` |
| **Now** / **Fecha y hora** | eval moment | `tradeDate`, `simulationTimeEt` |
| **Omitir actualizaci�n de barras** | skip bar step | `skipBars: true` |
| **Check Result** | read last job | `GET /context/intake/strategy-eval/result` |
| **Evaluate** | start job | `POST /context/intake/strategy-eval/trigger` |

### Status badge

| State | Label |
|-------|-------|
| Job running | **In progress** |
| Job complete | **Done at** `{time}` |

Use **Check Result** to refresh while **In progress**.

### Server actions

| Button | Server action | Client |
|--------|---------------|--------|
| Check Result | `checkMarketNowEvaluation` | `getStrategyEvalResult` |
| Evaluate | `startMarketNowEvaluation` | `triggerStrategyEvalStart` |

**Legacy fallback (404 on strategy-eval):** bar-request + N � `POST /tickers/{symbol}/check` � **Evaluate** blocks until **Done at**.

Details: [marketPage-apis.md �4](./marketPage-apis.md#4-strategy-eval-batch-result-now)

---

## Env

| Variable | Purpose |
|----------|---------|
| `FINANCE_AI_API_URL` | Main API |
| `FINANCE_AI_API_KEY` | Auth header |
| `FINANCE_AI_INTAKE_API_URL` | bar-request, strategy-eval |
| `FINANCE_AI_CALENDAR_API_URL` | market calendar (optional) |

Config UI: `/config/aws`
