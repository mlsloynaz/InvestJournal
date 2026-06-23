# Checklist rule met time — AWS contract

InvestJournal shows **Fit HH:mm ET** per strategy requirement when FinanceAI returns `metAtEt` on checklist items.

Applies to:

- `strategyChecklist.strategies[].checklist[]`
- `strategyChecklist.strategies[].requirements[]` (alias)
- `POST /rules/check` → `results[].check`
- Strategy-met polling → `currentEval.strategies[].requirements[]`

---

## Field

| Field | Type | When | Meaning |
|-------|------|------|---------|
| `metAtEt` | string | `status === "met"` | First time the rule became satisfied, **HH:mm** in **America/New_York** on the eval `tradeDate` |
| `metAt` | string (ISO) | optional | Same instant as ISO-8601 (audit / cross-day). UI prefers `metAtEt` |

### Example checklist item

```json
{
  "requirementId": "SR-01-03",
  "ruleKey": "hourly_candle_confirm",
  "label": "Vela 1h confirma dirección",
  "status": "met",
  "metAtEt": "10:15",
  "evidence": "Close 182.40 > BB mid"
}
```

UI renders: **Fit 10:15 ET**

---

## Backend rules (FinanceAI)

1. **Set only when `status === "met"`** — omit for `not_met`, `partial`, `unknown`, `manual`.
2. **`metAtEt` format:** `HH:mm` (24h), e.g. `"09:35"`, `"10:15"`. No timezone suffix required.
3. **First-fit time:** earliest bar/event that satisfied the rule on `tradeDate`, not the eval run time.
4. **Simulation:** use simulated session time (`simulationTimeEt` / replay clock), not wall clock.
5. **PRE phase:** if a rule is met from prior-session bars only, use the **bar close time** of the confirming candle (still `HH:mm ET` on the relevant session date; use `metAt` ISO if the date is not `tradeDate`).
6. **Incremental eval / NOW polling:** persist per-rule first-met time in TickerContext or strategy-met state so later polls do not overwrite with a later timestamp.
7. **Never satisfied yet:** omit `metAtEt` (UI shows ✓ without Fit line if status is met without time — avoid; always populate when marking met intraday).

---

## Endpoints to update

| Endpoint | Path |
|----------|------|
| Per-ticker check | `POST /tickers/{symbol}/check` |
| Strategy eval batch | `GET /context/intake/strategy-eval/result` → `results[].analysis` |
| Isolated SR test | `POST /rules/check` |
| NOW strategy-met | Strategy-met ticker eval payload |

---

## InvestJournal (consumer)

- Types: `FinanceAiStrategyCheckItem.metAtEt`, `FinanceAiStrategyMetRequirement.metAtEt`
- UI: `StrategyRequirementsList` → **Fit {HH:mm ET}** under met rules
- Formatter: `formatRuleMetAtEt()` in `src/lib/format-datetime.ts`

Until FinanceAI deploys this field, met rules show evidence only (no Fit line).
