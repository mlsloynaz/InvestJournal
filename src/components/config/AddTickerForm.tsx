import { createTicker } from "@/server/actions/tickers";

type Props = {
  rangoSymbols: string[];
};

export function AddTickerForm({ rangoSymbols }: Props) {
  const listId = "add-ticker-rango-symbols";

  return (
    <form
      action={createTicker}
      className="bg-white border rounded p-4 flex flex-wrap gap-3 items-end"
    >
      <label className="text-sm">
        Símbolo *
        <input
          type="text"
          name="symbol"
          required
          list={rangoSymbols.length > 0 ? listId : undefined}
          placeholder={rangoSymbols.length > 0 ? "Buscar en rangos…" : "AAPL"}
          className="block mt-1 uppercase min-w-[8rem]"
          autoComplete="off"
        />
        {rangoSymbols.length > 0 ? (
          <datalist id={listId}>
            {rangoSymbols.map((symbol) => (
              <option key={symbol} value={symbol} />
            ))}
          </datalist>
        ) : null}
      </label>
      <label className="text-sm">
        Nombre
        <input name="name" className="block mt-1" />
      </label>
      <label className="text-sm flex-1 min-w-[200px]">
        Notas
        <input name="notes" placeholder="Opcional" className="block mt-1 w-full" />
      </label>
      <button type="submit">Agregar</button>
    </form>
  );
}
