# Strategy eval batch API (Option B) � AWS contract

InvestJournal **Result Now** panel (`MarketNowEvaluatePanel`) uses this Intake API when deployed.  
Until then, the app falls back to `bar-request` + N � `POST /tickers/{symbol}/check`.

**Gateway:** `FINANCE_AI_INTAKE_API_URL` (fallback: main API URL)

---

## Trigger

```
POST /context/intake/strategy-eval/trigger
```

### Request body

```json
{
  "symbols": ["AAPL", "MSFT", "NVDA"],
  "strategies": ["estrategia-01", "estrategia-03"],
  "tradeDate": "2026-06-19",
  "simulationTimeEt": "10:15",
  "fresh": true,
  "skipBars": false
}
```

| Field | Required | Default | Meaning |
|-------|----------|---------|---------|
| `symbols` | yes | � | Tickers to evaluate |
| `strategies` | yes | � | Playbook ids (same as single `/check`) |
| `tradeDate` | no | today ET | Session date |
| `simulationTimeEt` | no | omitted | `HH:mm` ET � omit for **Now** |
| `fresh` | no | `true` | Recompute from latest bars |
| `skipBars` | no | `false` | If `false`, run incremental bar-request for `symbols` first (same as panel: `force`, `skipBb15`, `skipPipelineEval`, `resetBars: false`) |

### Responses

| Status | Meaning |
|--------|---------|
| **202 Accepted** | Job started � client polls **result** until complete |
| **200 OK** | Sync completion (small batches) � body includes full result |
| **404** | Not deployed � InvestJournal uses legacy per-ticker `/check` loop |

---

## Result (poll)

```
GET /context/intake/strategy-eval/result
```

Poll every ~5s until `status` is `complete` or `error`, or `updatedAt` changes from pre-trigger snapshot.

### Response body

```json
{
  "success": true,
  "strategyEval": {
    "status": "complete",
    "tradeDate": "2026-06-19",
    "simulationTimeEt": "10:15",
    "evaluatedAt": "2026-06-19T14:15:00.000Z",
    "updatedAt": "2026-06-19T14:15:00.000Z",
    "summary": { "total": 3, "ok": 2, "failed": 1 },
    "barRequest": {
      "ran": true,
      "successCount": 3,
      "failedSymbols": []
    },
    "results": [
      {
        "symbol": "AAPL",
        "success": true,
        "analysis": {}
      },
      {
        "symbol": "XYZ",
        "success": false,
        "error": "No context"
      }
    ]
  }
}
```

Alternative top-level key: `result` instead of `strategyEval` (client accepts both).

### `analysis` shape

Same as **`POST /tickers/{symbol}/check`** response � including `strategyChecklist.strategies[]` for requested playbooks.

### Job status

| `status` | Client behavior |
|----------|-----------------|
| `running` | Keep polling |
| `complete` | Stop; render `results` |
| `error` | Stop; surface `error` |

---

## InvestJournal client

| Function | File | Used by |
|----------|------|---------|
| `triggerStrategyEvalStart` | `src/server/services/finance-ai-client.ts` | **Evaluate** (POST only, no poll) |
| `getStrategyEvalResult` | same | **Check Result**, panel mount |
| `triggerStrategyEvalFlow` | same | Legacy helper (trigger + poll) |
| `checkMarketNowEvaluation` | `src/server/actions/finance-ai.ts` | **Check Result** button |
| `startMarketNowEvaluation` | same | **Evaluate** button |
| `runMarketNowEvaluation` | same | Deprecated for UI; full sync trigger+poll |

**UI:** `MarketNowEvaluatePanel` on `/market` � see [marketPage-apis.md](./marketPage-apis.md).

Legacy fallback when trigger returns **404**:  
`POST /context/intake/bar-request/trigger` + `POST /tickers/{symbol}/check` per symbol.

---

## Relation to other intake jobs

| Job | Use case |
|-----|----------|
| `bar-request` | Bars only |
| `market-start-flow` | PRE + TickersToday + persist |
| **`strategy-eval`** | Market panel: bars (optional) + multi-ticker strategy check, **no persist**, arbitrary Now/sim time |
