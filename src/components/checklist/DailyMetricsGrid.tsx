import { DailyMetric } from "@prisma/client";
import { saveDailyMetric } from "@/server/actions/weekly";
import { WEEKDAY_LABELS } from "@/lib/week";
import { decimalToString } from "@/lib/utils";

type Props = {
  symbol: string;
  weekStart: string;
  metrics: DailyMetric[];
};

export function DailyMetricsGrid({ symbol, weekStart, metrics }: Props) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-investep-navy">8. Seguimiento diario (L–V)</h2>
      <table className="data-table">
        <thead>
          <tr>
            <th>Día</th>
            <th>Distancia</th>
            <th>Spot price</th>
            <th>Strike price</th>
            <th className="w-24" />
          </tr>
        </thead>
        <tbody>
          {metrics.map((metric) => (
            <tr key={metric.id}>
              <td className="font-medium whitespace-nowrap">
                {WEEKDAY_LABELS[metric.dayOfWeek - 1] ?? metric.dayOfWeek}
                <span className="block text-xs text-gray-500">
                  {metric.tradeDate.toISOString().slice(0, 10)}
                </span>
              </td>
              <td colSpan={4} className="!p-2">
                <form action={saveDailyMetric} className="flex gap-2 items-end">
                  <input type="hidden" name="symbol" value={symbol} />
                  <input type="hidden" name="weekStart" value={weekStart} />
                  <input type="hidden" name="metricId" value={metric.id} />
                  <input
                    name="distance"
                    placeholder="Distancia"
                    defaultValue={decimalToString(metric.distance)}
                    className="flex-1 min-w-0"
                  />
                  <input
                    name="spotPrice"
                    placeholder="Spot"
                    defaultValue={decimalToString(metric.spotPrice)}
                    className="flex-1 min-w-0"
                  />
                  <input
                    name="strikePrice"
                    placeholder="Strike"
                    defaultValue={decimalToString(metric.strikePrice)}
                    className="flex-1 min-w-0"
                  />
                  <button type="submit" className="shrink-0">
                    Guardar
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
