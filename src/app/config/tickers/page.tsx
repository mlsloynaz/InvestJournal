import { BuySellTickersPanel } from "@/components/config/BuySellTickersPanel";
import { JournalTickersPanel } from "@/components/config/JournalTickersPanel";
import { TickerMlongSettingsPanel } from "@/components/config/TickerMlongSettingsPanel";
import { TickerSettingsPanel } from "@/components/config/TickerSettingsPanel";
import { RangoOptimoImportPanel } from "@/components/config/RangoOptimoImportPanel";
import { getFinanceAiScheduleSettings } from "@/server/actions/finance-ai-schedules";
import {
  getRangoOptimoLastDate,
  listRangoOptimoEntries,
} from "@/server/actions/rango-optimo";
import {
  listBolinger15Symbols,
  listJournalTickers,
  listMlongSymbols,
} from "@/server/actions/tickers";
import { isFinanceAiConfigured } from "@/server/services/finance-ai-client";

export default async function ConfigTickersPage() {
  const configured = isFinanceAiConfigured();
  let journalTickers: Awaited<ReturnType<typeof listJournalTickers>> = [];
  let rangoOptimoRows: Awaited<ReturnType<typeof listRangoOptimoEntries>> = [];
  let rangoOptimoLastDate: string | null = null;
  let initialBb15Tickers: string[] = [];
  let initialMlongTickers: string[] = [];
  let initialBuySellTickers: string[] = [];
  let buySellEnabled = false;

  try {
    journalTickers = await listJournalTickers();
    rangoOptimoRows = await listRangoOptimoEntries();
    rangoOptimoLastDate = await getRangoOptimoLastDate();
    initialBb15Tickers = await listBolinger15Symbols();
    initialMlongTickers = await listMlongSymbols();
  } catch {
    return <p className="text-sm text-red-700">Base de datos no disponible.</p>;
  }

  if (configured) {
    const result = await getFinanceAiScheduleSettings();
    if (result.settings) {
      if (initialBb15Tickers.length === 0) {
        const fromAws = result.settings.bolinger15Tickers ?? [];
        if (fromAws.length > 0) {
          initialBb15Tickers = fromAws.map((s) => s.toUpperCase());
        }
      }
      initialBuySellTickers = (result.settings.buySellTickers ?? []).map((s) => s.toUpperCase());
      buySellEnabled = result.settings.buySellEnabled === true;
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-investep-navy">Tickers</h1>
        <p className="text-sm text-gray-600 mt-1">
          Rangos optimos, Movimiento 15M, Movimientos Long, Buy/Sell, intervalos NOW y tickers del journal.
        </p>
      </div>

      <RangoOptimoImportPanel
        lastImportDate={rangoOptimoLastDate}
        rowCount={rangoOptimoRows.length}
      />

      <TickerSettingsPanel
        configured={configured}
        rangoOptimoRows={rangoOptimoRows}
        initialBb15Tickers={initialBb15Tickers}
        lastImportDate={rangoOptimoLastDate}
      />

      <TickerMlongSettingsPanel
        rangoOptimoRows={rangoOptimoRows}
        initialMlongTickers={initialMlongTickers}
        lastImportDate={rangoOptimoLastDate}
      />

      <BuySellTickersPanel
        configured={configured}
        buySellEnabled={buySellEnabled}
        initialBuySellTickers={initialBuySellTickers}
        rangoOptimoRows={rangoOptimoRows}
      />

      <JournalTickersPanel
        rows={journalTickers}
        configured={configured}
        rangoSymbols={rangoOptimoRows.map((r) => r.symbol)}
      />
    </div>
  );
}
