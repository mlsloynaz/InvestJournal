import { addInvestmentPlanEntry } from "@/server/actions/investment-plan";
import {
  formatMoney,
  PLAN_ACCOUNT_LABELS,
  PLAN_MODE_RATE,
  type InvestmentPlanModeKey,
  type PlanAccountKey,
} from "@/lib/investment-plan";

type Props = {
  mode: InvestmentPlanModeKey;
  account: PlanAccountKey;
  suggestedInvest: number;
  suggestedRentabilidad: number;
  priorCapital: number;
  tickers: string[];
};

export function PlanEntryForm({
  mode,
  account,
  suggestedInvest: sugInvest,
  suggestedRentabilidad: sugRent,
  priorCapital,
  tickers,
}: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const rate = PLAN_MODE_RATE[mode];
  const listId = "plan-entry-tickers";

  return (
    <section className="bg-white border-2 border-investep-gold/40 rounded-lg p-4 space-y-3 print:hidden">
      <h2 className="text-sm font-semibold text-investep-navy uppercase tracking-wide">
        Nueva entrada
      </h2>
      <p className="text-xs text-gray-600">
        Vista: <strong>{PLAN_ACCOUNT_LABELS[account]}</strong> · Capital vigente:{" "}
        <strong>{formatMoney(priorCapital)}</strong> · Rentabilidad objetivo: <strong>{rate}%</strong>
      </p>
      <form action={addInvestmentPlanEntry} className="flex flex-wrap gap-3 items-end">
        <input type="hidden" name="mode" value={mode} />
        <input type="hidden" name="account" value={account} />
        <label className="text-sm">
          Fecha *
          <input type="date" name="entryDate" required defaultValue={today} className="block mt-1" />
        </label>
        <label className="text-sm min-w-[88px]">
          Ticker
          <input
            type="text"
            name="ticker"
            list={listId}
            placeholder="AAPL"
            className="block mt-1 uppercase w-full"
            autoComplete="off"
          />
        </label>
        <datalist id={listId}>
          {tickers.map((symbol) => (
            <option key={symbol} value={symbol} />
          ))}
        </datalist>
        <fieldset className="text-sm border border-investep-navy/20 rounded px-2 py-1">
          <legend className="text-xs px-1">Tipo entrada</legend>
          <div className="flex gap-3 mt-1">
            <label className="flex items-center gap-1">
              <input
                type="radio"
                name="entryAccount"
                value="real"
                defaultChecked={account === "real"}
              />
              Real
            </label>
            <label className="flex items-center gap-1">
              <input
                type="radio"
                name="entryAccount"
                value="practice"
                defaultChecked={account === "practice"}
              />
              Práctica
            </label>
          </div>
        </fieldset>
        <label className="text-sm min-w-[120px]">
          Inversión *
          <input
            type="number"
            name="investAmount"
            step="0.01"
            min="0"
            required
            defaultValue={sugInvest}
            className="w-full mt-1"
          />
        </label>
        <label className="text-sm min-w-[120px]">
          Rentabilidad *
          <input
            type="number"
            name="rentabilidad"
            step="0.01"
            required
            defaultValue={sugRent}
            className="w-full mt-1"
          />
        </label>
        <button type="submit">Agregar</button>
      </form>
    </section>
  );
}
