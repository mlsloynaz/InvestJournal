import { Trade } from "@prisma/client";
import { createTrade, deleteTrade } from "@/server/actions/trades";
import { decimalToString } from "@/lib/utils";

type Props = {
  symbol: string;
  weekStart: string;
  trades: Trade[];
};

export function TradesTable({ symbol, weekStart, trades }: Props) {
  const totalPnl = trades.reduce(
    (s, t) => s + (t.profitabilityUsd ? Number(t.profitabilityUsd) : 0),
    0
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-investep-navy">9–10. Registro de operaciones</h2>
        <p className="text-sm">
          P&amp;L semana:{" "}
          <span className={totalPnl >= 0 ? "met-yes" : "met-no"}>
            ${totalPnl.toFixed(2)}
          </span>
        </p>
      </div>

      <table className="data-table text-xs">
        <thead>
          <tr>
            <th>Fecha exp</th>
            <th>Tipo</th>
            <th>Fecha</th>
            <th>Hora</th>
            <th>Contratos</th>
            <th>Precio</th>
            <th>Rent. $</th>
            <th>Plan %</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {trades.length === 0 && (
            <tr>
              <td colSpan={9} className="text-center text-gray-500 py-4">
                Sin operaciones registradas
              </td>
            </tr>
          )}
          {trades.map((t) => (
            <tr key={t.id}>
              <td>{t.expirationDate?.toISOString().slice(0, 10) ?? "—"}</td>
              <td>{t.optionType ?? "—"}</td>
              <td>{t.tradeDate?.toISOString().slice(0, 10) ?? "—"}</td>
              <td>
                {t.tradeTime
                  ? t.tradeTime.toISOString().slice(11, 16)
                  : "—"}
              </td>
              <td>{t.contracts ?? "—"}</td>
              <td>{decimalToString(t.tradePrice) || "—"}</td>
              <td>{decimalToString(t.profitabilityUsd) || "—"}</td>
              <td>{decimalToString(t.planPercent) || "—"}</td>
              <td>
                <form action={deleteTrade}>
                  <input type="hidden" name="symbol" value={symbol} />
                  <input type="hidden" name="weekStart" value={weekStart} />
                  <input type="hidden" name="tradeId" value={t.id} />
                  <button type="submit" className="!bg-red-700 !px-2 !py-0.5 text-xs">
                    ×
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <form action={createTrade} className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm border p-3 rounded bg-white/50">
        <input type="hidden" name="symbol" value={symbol} />
        <input type="hidden" name="weekStart" value={weekStart} />
        <label>
          Fecha exp
          <input type="date" name="expirationDate" className="w-full mt-1" />
        </label>
        <label>
          Tipo
          <input name="optionType" placeholder="Call/Put" className="w-full mt-1" />
        </label>
        <label>
          Fecha
          <input type="date" name="tradeDate" className="w-full mt-1" />
        </label>
        <label>
          Hora
          <input type="time" name="tradeTime" className="w-full mt-1" />
        </label>
        <label>
          Contratos
          <input name="contracts" type="number" className="w-full mt-1" />
        </label>
        <label>
          Precio
          <input name="tradePrice" className="w-full mt-1" />
        </label>
        <label>
          Rent. $
          <input name="profitabilityUsd" className="w-full mt-1" />
        </label>
        <label>
          Plan %
          <input name="planPercent" className="w-full mt-1" />
        </label>
        <div className="col-span-full">
          <button type="submit">+ Agregar operación</button>
        </div>
      </form>
    </div>
  );
}
