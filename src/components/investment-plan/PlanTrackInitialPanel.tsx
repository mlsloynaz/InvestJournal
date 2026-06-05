import { setTrackInitialCapital } from "@/server/actions/investment-plan";
import {
  formatMoney,
  PLAN_ACCOUNT_LABELS,
  PLAN_MODE_LABELS,
  type InvestmentPlanModeKey,
  type PlanAccountKey,
} from "@/lib/investment-plan";

type Props = {
  mode: InvestmentPlanModeKey;
  account: PlanAccountKey;
  initialCapital: number | null;
  setAt: string | null;
};

export function PlanTrackInitialPanel({ mode, account, initialCapital, setAt }: Props) {
  if (initialCapital != null) {
    return (
      <section className="bg-investep-gold/15 border border-investep-gold/50 rounded-lg px-4 py-3 print:hidden">
        <p className="text-sm text-gray-800">
          <span className="text-xs uppercase tracking-wide text-gray-600 mr-2">
            Capital inicial (una sola vez)
          </span>
          {PLAN_MODE_LABELS[mode]} · {PLAN_ACCOUNT_LABELS[account]}:{" "}
          <strong className="text-investep-navy">${formatMoney(initialCapital)}</strong>
          {setAt && (
            <span className="text-xs text-gray-500 ml-2">— definido {setAt}</span>
          )}
        </p>
      </section>
    );
  }

  return (
    <section className="bg-white border-2 border-investep-navy/30 rounded-lg p-4 space-y-3 print:hidden">
      <h2 className="text-sm font-semibold text-investep-navy uppercase tracking-wide">
        Capital inicial (una sola vez)
      </h2>
      <p className="text-xs text-gray-600">
        Para {PLAN_MODE_LABELS[mode]} · {PLAN_ACCOUNT_LABELS[account]}. Solo se ingresa una vez;
        después el capital crece con cada rentabilidad.
      </p>
      <form action={setTrackInitialCapital} className="flex flex-wrap gap-3 items-end">
        <input type="hidden" name="mode" value={mode} />
        <input type="hidden" name="account" value={account} />
        <label className="text-sm min-w-[160px]">
          Monto inicial *
          <input
            type="number"
            name="initialCapital"
            step="0.01"
            min="0.01"
            required
            placeholder="2500"
            className="w-full mt-1"
          />
        </label>
        <button type="submit">Definir capital inicial</button>
      </form>
    </section>
  );
}
