import {
  formatMoney,
  monthLabel,
  PLAN_MODE_RATE,
  type InvestmentPlanModeKey,
  type PlanAccountKey,
  type PlanMonthView,
} from "@/lib/investment-plan";
import { deleteInvestmentPlanEntry } from "@/server/actions/investment-plan";

type Props = {
  mode: InvestmentPlanModeKey;
  month: PlanMonthView;
};

export function PlanMonthSection({ mode, month }: Props) {
  const rate = PLAN_MODE_RATE[mode];

  return (
    <section className="bg-white border border-investep-navy/20 rounded-lg overflow-hidden print:break-inside-avoid">
      <div className="px-4 py-3 bg-investep-navy/5 border-b">
        <h3 className="text-sm font-semibold text-investep-navy capitalize">
          {monthLabel(month.yearMonth)}
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="data-table text-sm">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Ticker</th>
              <th>Tipo</th>
              <th>Inversión</th>
              <th>%</th>
              <th>Rentabilidad</th>
              <th>Capital</th>
              <th>Semana</th>
              <th className="w-10 print:hidden" />
            </tr>
          </thead>
          <tbody>
            {month.entries.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center text-gray-500 py-4">
                  Sin entradas en este mes.
                </td>
              </tr>
            )}
            {month.entries.map((row) => (
              <tr key={row.id}>
                <td className="whitespace-nowrap">{row.entryDate}</td>
                <td className="font-medium whitespace-nowrap">{row.ticker ?? "—"}</td>
                <td className="text-xs whitespace-nowrap">
                  {row.isPractice ? "Práctica" : "Real"}
                </td>
                <td className="whitespace-nowrap">{formatMoney(row.investAmount)}</td>
                <td>{rate}%</td>
                <td className="whitespace-nowrap">{formatMoney(row.rentabilidad)}</td>
                <td className="font-medium whitespace-nowrap">{formatMoney(row.capital)}</td>
                <td className="text-center">{row.weekOfMonth}</td>
                <td className="print:hidden">
                  <form action={deleteInvestmentPlanEntry}>
                    <input type="hidden" name="id" value={row.id} />
                    <button type="submit" className="!bg-red-700 !px-1.5 !py-0.5 text-xs">
                      ×
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
