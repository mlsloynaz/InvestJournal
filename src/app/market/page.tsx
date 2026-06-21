import Link from "next/link";

import { MarketWorkspace } from "@/components/market/MarketWorkspace";
import {
  getFinanceAiConfigStatus,
} from "@/server/actions/finance-ai";
import { loadPersistedMov15mStatus } from "@/server/actions/mov15m-snapshot";
import { loadPersistedE03OutsideBatch } from "@/server/actions/e03-outside-snapshot";
import { loadTestingCriteriasCatalog } from "@/server/actions/testing-criterias";
import { parseTestingCriteriasSearchParams } from "@/lib/testing-criterias-link";
import { resolveMarketTabFromSearch } from "@/lib/market-tab";
import {
  listTickersForTickerContext,
  listMlongTickersForMarket,
  listBolinger15Symbols,
} from "@/server/actions/tickers";

function mapMarketTickerRow(
  t: Awaited<ReturnType<typeof listTickersForTickerContext>>[number]
) {
  return {
    symbol: t.symbol,
    name: t.name,
    isFavorite: t.isFavorite,
    financeAi: {
      status: t.financeAiStatus,
      syncedAt: t.financeAiSyncedAt?.toISOString() ?? null,
      lastBarAt: t.financeAiLastBarAt,
      error: t.financeAiError,
      premarketAt: t.financeAiPremarketAt?.toISOString() ?? null,
      premarketMode: t.financeAiPremarketMode,
      premarketBias: t.financeAiPremarketBias,
      premarketRevision: t.financeAiPremarketRevision,
      premarketDate: t.financeAiPremarketDate,
      liveEligible: t.financeAiLiveEligible,
      premarketGapEntry: t.financeAiPremarketGapEntry,
    },
  };
}

export default async function MarketPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const configured = (await getFinanceAiConfigStatus()).configured;
  const resolvedSearch = searchParams ? await searchParams : {};
  const tab = resolveMarketTabFromSearch(resolvedSearch);
  const testingCriteriasDeepLink = parseTestingCriteriasSearchParams(resolvedSearch);

  let tickers: Awaited<ReturnType<typeof listTickersForTickerContext>> = [];
  let evaluateTickers: Awaited<ReturnType<typeof listMlongTickersForMarket>> = [];
  let bb15ConfigWatchlist: string[] = [];
  let catalogResult: Awaited<ReturnType<typeof loadTestingCriteriasCatalog>> = {
    success: false,
    error: "No se pudo cargar el catálogo de criterios",
  };
  let loadError: string | null = null;

  let persisted: Awaited<ReturnType<typeof loadPersistedMov15mStatus>> = {
    success: false,
  };
  let e03Persisted: Awaited<ReturnType<typeof loadPersistedE03OutsideBatch>> = {
    success: false,
  };

  try {
    persisted = await loadPersistedMov15mStatus();
    e03Persisted = await loadPersistedE03OutsideBatch();
    bb15ConfigWatchlist = await listBolinger15Symbols();
    tickers = await listTickersForTickerContext();
    catalogResult = await loadTestingCriteriasCatalog();

    if (tab === "context") {
      evaluateTickers = await listMlongTickersForMarket();
    }
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Error al cargar tickers";
  }

  return (
    <div className="space-y-6 max-w-7xl">
      <header>
        <p className="text-xs uppercase tracking-wider text-investep-gold">InvestJournal</p>
        <h1 className="text-2xl font-bold text-investep-navy">Market</h1>
        <p className="text-sm text-gray-600 mt-1">
          Ticker Context, Result Now, Movimientos 15m, and Testing criterias (FinanceAI / AWS).
        </p>
      </header>

      {!configured && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-900">
          <p className="font-medium">FinanceAI no configurado</p>
          <p className="mt-1 text-xs">
            Agrega en <code className="bg-white/80 px-1">.env</code>{" "}
            <code className="bg-white/80 px-1">FINANCE_AI_API_URL</code> y{" "}
            <code className="bg-white/80 px-1">FINANCE_AI_API_KEY</code>. Ver{" "}
            <Link href="/config/aws" className="underline">
              Config AWS
            </Link>
            . Otras pestanas pueden usar datos locales.
          </p>
        </div>
      )}

      {loadError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-900">
          <p className="font-medium">No se pudieron cargar los tickers</p>
          <p className="mt-1 text-xs">{loadError}</p>
        </div>
      )}

      {!loadError && (
        <MarketWorkspace
          configured={configured}
          tickers={tickers.map(mapMarketTickerRow)}
          evaluateTickers={evaluateTickers}
          mov15mInitialStatus={persisted.status ?? null}
          mov15mPersistedAt={persisted.persistedAt ?? null}
          mov15mConfigWatchlist={bb15ConfigWatchlist}
          mov15mE03InitialRows={e03Persisted.rows ?? []}
          mov15mE03PersistedAt={e03Persisted.persistedAt ?? null}
          testingCriteriasTickers={tickers.map((t) => ({
            symbol: t.symbol,
            name: t.name,
          }))}
          testingCriteriasCatalog={
            catalogResult.success && catalogResult.catalog ? catalogResult.catalog : null
          }
          testingCriteriasCatalogError={
            catalogResult.success ? null : (catalogResult.error ?? null)
          }
          testingCriteriasDeepLink={testingCriteriasDeepLink}
        />
      )}

      <p className="text-xs text-gray-500">
        <Link href="/config/tickers" className="underline">
          Config tickers
        </Link>
        {" | "}
        <Link href="/config/aws" className="underline">
          Config AWS
        </Link>
      </p>
    </div>
  );
}

export const metadata = {
  title: "Market - InvestJournal",
};

export const dynamic = "force-dynamic";
