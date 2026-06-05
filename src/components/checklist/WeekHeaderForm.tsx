import { TickerWeek } from "@prisma/client";
import { saveTickerWeekHeader } from "@/server/actions/weekly";
import { decimalToString } from "@/lib/utils";

type Props = {
  symbol: string;
  weekStart: string;
  tickerWeek: TickerWeek;
};

export function WeekHeaderForm({ symbol, weekStart, tickerWeek }: Props) {
  return (
    <form
      action={saveTickerWeekHeader}
      className="bg-white border-2 border-investep-navy rounded p-4 grid md:grid-cols-4 gap-4 items-end"
    >
      <input type="hidden" name="symbol" value={symbol} />
      <input type="hidden" name="weekStart" value={weekStart} />
      <div>
        <p className="text-xs uppercase text-investep-gold font-semibold">Análisis básico</p>
        <p className="text-xl font-bold text-investep-navy">{symbol}</p>
        <p className="text-sm text-gray-600">Semana desde {weekStart}</p>
      </div>
      <label className="text-sm">
        Rango precio (bajo)
        <input
          name="priceRangeLow"
          defaultValue={decimalToString(tickerWeek.priceRangeLow)}
          className="w-full mt-1"
        />
      </label>
      <label className="text-sm">
        Rango precio (alto)
        <input
          name="priceRangeHigh"
          defaultValue={decimalToString(tickerWeek.priceRangeHigh)}
          className="w-full mt-1"
        />
      </label>
      <div className="flex gap-2 items-end">
        <label className="text-sm flex-1">
          Notas cabecera
          <input
            name="headerNotes"
            defaultValue={tickerWeek.headerNotes ?? ""}
            className="w-full mt-1"
          />
        </label>
        <button type="submit">Guardar</button>
      </div>
    </form>
  );
}
