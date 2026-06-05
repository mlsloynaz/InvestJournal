import {
  formatMoney,
  PLAN_ACCOUNT_LABELS,
  PLAN_MODE_LABELS,
  type InvestmentPlanModeKey,
  type PlanAccountKey,
  type TickerReportRow,
  type WeekTickerReportRow,
} from "@/lib/investment-plan";

type Props = {
  mode: InvestmentPlanModeKey;
  account: PlanAccountKey;
  today: string;
  byWeek: WeekTickerReportRow[];
  byTicker: TickerReportRow[];
  totalRentabilidad: number;
};

export function PlanEarningsReport({
  mode,
  account,
  today,
  byWeek,
  byTicker,
  totalRentabilidad,
}: Props) {
  return (
    <section
      id="plan-earnings-report"
      className="bg-white border border-investep-navy/20 rounded-lg p-6 space-y-6 print:border-0 print:p-0 print:shadow-none"
    >
      <header className="space-y-1 border-b border-gray-200 pb-4">
        <h2 className="text-lg font-bold text-investep-navy">Reporte de rentabilidad</h2>
        <p className="text-sm text-gray-600">
          {PLAN_MODE_LABELS[mode]} · {PLAN_ACCOUNT_LABELS[account]} · Hasta {today}
        </p>
        <p className="text-sm">
          Total rentabilidad ({PLAN_ACCOUNT_LABELS[account]}):{" "}
          <strong className="text-investep-navy">${formatMoney(totalRentabilidad)}</strong>
        </p>
      </header>

      <div>
        <h3 className="text-sm font-semibold text-investep-navy mb-2">Por semana y ticker</h3>
        {byWeek.length === 0 ? (
          <p className="text-sm text-gray-500">Sin datos para el reporte.</p>
        ) : (
          <div className="space-y-4">
            {byWeek.map((week) => (
              <div key={`${week.yearMonth}-${week.weekOfMonth}`} className="border rounded p-3">
                <p className="text-sm font-medium text-investep-navy mb-2">{week.label}</p>
                <table className="data-table text-sm">
                  <thead>
                    <tr>
                      <th>Ticker</th>
                      <th>Inversión</th>
                      <th>Rentabilidad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {week.tickers.map((t) => (
                      <tr key={t.ticker}>
                        <td>{t.ticker}</td>
                        <td>{formatMoney(t.investAmount)}</td>
                        <td>{formatMoney(t.rentabilidad)}</td>
                      </tr>
                    ))}
                    <tr className="bg-investep-gold/15 font-semibold">
                      <td>Subtotal semana</td>
                      <td />
                      <td>{formatMoney(week.weekTotal)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-investep-navy mb-2">Por ticker (total)</h3>
        {byTicker.length === 0 ? (
          <p className="text-sm text-gray-500">Sin datos.</p>
        ) : (
          <table className="data-table text-sm">
            <thead>
              <tr>
                <th>Ticker</th>
                <th>Entradas</th>
                <th>Inversión</th>
                <th>Rentabilidad</th>
              </tr>
            </thead>
            <tbody>
              {byTicker.map((t) => (
                <tr key={t.ticker}>
                  <td>{t.ticker}</td>
                  <td className="text-center">{t.entryCount}</td>
                  <td>{formatMoney(t.investAmount)}</td>
                  <td>{formatMoney(t.rentabilidad)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
