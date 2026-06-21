"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { FinanceAiMov15mStatus } from "@/lib/finance-ai-types";
import type { E03OutsideTickerRow } from "@/lib/e03-outside-display";
import { Mov15mWorkspace } from "@/components/gestion/Mov15mWorkspace";
import { CheckTickerPanel } from "@/components/gestion/CheckTickerPanel";
import { InicializarTickersPanel } from "@/components/gestion/InicializarTickersPanel";
import { TestingCriteriasWorkspace } from "@/components/gestion/TestingCriteriasWorkspace";
import { MarketNowEvaluatePanel } from "@/components/market/MarketNowEvaluatePanel";
import {
  MarketSubnav,
  resolveMarketTab,
  type MarketTab,
} from "@/components/market/MarketSubnav";
import type { TestingCriteriasDeepLink } from "@/lib/testing-criterias-link";
import type { TestingCriteriaCatalog } from "@/server/actions/testing-criterias";

export type MarketTickerRow = {
  symbol: string;
  name: string | null;
  isFavorite?: boolean;
  financeAi: {
    status: string | null;
    syncedAt: string | null;
    lastBarAt: string | null;
    error: string | null;
    premarketAt: string | null;
    premarketMode: string | null;
    premarketBias: string | null;
    premarketRevision: number | null;
    premarketDate: string | null;
    liveEligible: boolean;
    premarketGapEntry?: boolean;
  };
};

type Props = {
  configured: boolean;
  tickers: MarketTickerRow[];
  evaluateTickers: { symbol: string; name: string | null }[];
  mov15mInitialStatus: FinanceAiMov15mStatus | null;
  mov15mPersistedAt: string | null;
  mov15mConfigWatchlist: string[];
  mov15mE03InitialRows?: E03OutsideTickerRow[];
  mov15mE03PersistedAt?: string | null;
  testingCriteriasTickers: { symbol: string; name: string | null }[];
  testingCriteriasCatalog: TestingCriteriaCatalog | null;
  testingCriteriasCatalogError: string | null;
  testingCriteriasDeepLink: TestingCriteriasDeepLink;
};

function mapContextRow(t: MarketTickerRow) {
  return {
    symbol: t.symbol,
    name: t.name,
    isFavorite: t.isFavorite,
    financeAi: {
      status: t.financeAi.status,
      syncedAt: t.financeAi.syncedAt,
      lastBarAt: t.financeAi.lastBarAt,
      error: t.financeAi.error,
    },
  };
}

function MarketWorkspaceContent({
  configured,
  tickers,
  evaluateTickers,
  mov15mInitialStatus,
  mov15mPersistedAt,
  mov15mConfigWatchlist,
  mov15mE03InitialRows,
  mov15mE03PersistedAt,
  testingCriteriasTickers,
  testingCriteriasCatalog,
  testingCriteriasCatalogError,
  testingCriteriasDeepLink,
  tab,
}: Props & { tab: MarketTab }) {
  const [resultNowOpen, setResultNowOpen] = useState(false);
  const [checkTickerOpen, setCheckTickerOpen] = useState(false);
  const [tickerContextOpen, setTickerContextOpen] = useState(false);

  useEffect(() => {
    if (tab !== "context") return;
    if (window.location.hash === "#journey-check-ticker") {
      setCheckTickerOpen(true);
      const id = window.setTimeout(() => {
        document.getElementById("journey-check-ticker")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 80);
      return () => window.clearTimeout(id);
    }
    if (window.location.hash !== "#journey-result-now") return;
    setResultNowOpen(true);
    const id = window.setTimeout(() => {
      document.getElementById("journey-result-now")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 80);
    return () => window.clearTimeout(id);
  }, [tab]);

  if (tab === "bb15") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-600 max-w-3xl">
          Dos paneles sobre la watchlist Movimiento 15M (mshort):{" "}
          <strong>Inside Bolinger</strong> (E05) vía{" "}
          <code className="text-xs bg-gray-100 px-1 rounded">POST /context/mov15m/status</code>
          ;{" "}
          <strong>Outside Bolinger</strong> (E03) vía{" "}
          <code className="text-xs bg-gray-100 px-1 rounded">POST /tickers/{"{symbol}"}/check</code>.
          Tickers en Config / Tickers / Movimiento 15M.
        </p>
        <Mov15mWorkspace
          financeAiConfigured={configured}
          initialStatus={mov15mInitialStatus}
          persistedAt={mov15mPersistedAt}
          configWatchlist={mov15mConfigWatchlist}
          e03InitialRows={mov15mE03InitialRows}
          e03PersistedAt={mov15mE03PersistedAt}
        />
      </div>
    );
  }

  if (tab === "testing-criterias") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-600 max-w-3xl">
          Prueba cada <strong>strategy requirement (SR)</strong> de forma aislada sobre todos
          los tickers del catalogo - via{" "}
          <code className="text-xs bg-gray-100 px-1 rounded">POST /rules/check</code>.
        </p>
        {!testingCriteriasCatalog ? (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-900">
            <p className="font-medium">No se pudo cargar el catalogo de criterios</p>
            <p className="text-xs mt-1">
              {testingCriteriasCatalogError ??
                "Revisa estrategia-*.md en C:\\dta\\strategies"}
            </p>
          </div>
        ) : (
          <TestingCriteriasWorkspace
            tickers={testingCriteriasTickers}
            catalog={testingCriteriasCatalog}
            financeAiConfigured={configured}
            initialDeepLink={testingCriteriasDeepLink}
          />
        )}
      </div>
    );
  }

  if (!configured) {
    return (
      <p className="text-sm text-gray-500">
        Configura FinanceAI para usar Ticker Context y Result Now.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <CheckTickerPanel open={checkTickerOpen} onOpenChange={setCheckTickerOpen} />
      <InicializarTickersPanel
        tickers={tickers.map(mapContextRow)}
        open={tickerContextOpen}
        onOpenChange={setTickerContextOpen}
      />
      <MarketNowEvaluatePanel
        evaluateTickers={evaluateTickers}
        open={resultNowOpen}
        onOpenChange={setResultNowOpen}
      />
    </div>
  );
}

function MarketWorkspaceShell(props: Props) {
  const searchParams = useSearchParams();
  const urlTab = resolveMarketTab(searchParams);
  const [tab, setTab] = useState<MarketTab>(urlTab);

  useEffect(() => {
    setTab(urlTab);
  }, [urlTab]);

  useEffect(() => {
    const onPopState = () => {
      setTab(resolveMarketTab(new URLSearchParams(window.location.search)));
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const selectTab = useCallback((nextTab: MarketTab, href: string) => {
    if (nextTab === tab) return;
    setTab(nextTab);
    window.history.replaceState(null, "", href);
  }, [tab]);

  return (
    <>
      <MarketSubnav activeTab={tab} onSelectTab={selectTab} />
      <MarketWorkspaceContent {...props} tab={tab} />
    </>
  );
}

export function MarketWorkspace(props: Props) {
  return (
    <Suspense fallback={<p className="text-sm text-gray-500">Cargando Market...</p>}>
      <MarketWorkspaceShell {...props} />
    </Suspense>
  );
}
