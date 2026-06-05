import { createTicker, listTickers } from "@/server/actions/tickers";
import { TickerFavoriteToggle } from "@/components/config/TickerFavoriteToggle";

export default async function ConfigTickersPage() {
  let tickers: Awaited<ReturnType<typeof listTickers>> = [];

  try {
    tickers = await listTickers();
  } catch {
    return <p className="text-sm text-red-700">Base de datos no disponible.</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-investep-navy">Tickers</h1>
        <p className="text-sm text-gray-600 mt-1">
          Agrega tickers y marca <strong>☆ Favorito</strong> para mostrarlos en el dashboard.
        </p>
      </div>

      <form action={createTicker} className="bg-white border rounded p-4 flex flex-wrap gap-3 items-end">
        <label className="text-sm">
          Símbolo *
          <input name="symbol" required placeholder="AAPL" className="block mt-1 uppercase" />
        </label>
        <label className="text-sm">
          Nombre
          <input name="name" className="block mt-1" />
        </label>
        <button type="submit">Agregar</button>
      </form>

      <ul className="divide-y bg-white border rounded">
        {tickers.length === 0 && (
          <li className="p-4 text-sm text-gray-500">No hay tickers todavía.</li>
        )}
        {tickers.map((t) => (
          <li
            key={t.id}
            className="px-4 py-3 flex flex-wrap gap-3 items-center justify-between"
          >
            <div className="min-w-0">
              <span className="font-semibold text-investep-navy">{t.symbol}</span>
              {t.name && <span className="text-gray-500 text-sm ml-2">{t.name}</span>}
            </div>
            <TickerFavoriteToggle id={t.id} isFavorite={t.isFavorite} />
          </li>
        ))}
      </ul>
    </div>
  );
}
