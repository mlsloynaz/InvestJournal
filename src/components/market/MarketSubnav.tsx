"use client";

import {
  MARKET_BB15_TAB,
  MARKET_PATH,
  MARKET_TESTING_CRITERIAS_TAB,
} from "@/lib/tools-paths";
import { resolveMarketTab, type MarketTab } from "@/lib/market-tab";

export type { MarketTab };
export { resolveMarketTab };

export const MARKET_TABS: { id: MarketTab; href: string; label: string }[] = [
  { id: "context", href: MARKET_PATH, label: "Context & Result Now" },
  { id: "bb15", href: `${MARKET_PATH}?tab=${MARKET_BB15_TAB}`, label: "Movimientos 15m" },
  {
    id: "testing-criterias",
    href: `${MARKET_PATH}?tab=${MARKET_TESTING_CRITERIAS_TAB}`,
    label: "Testing criterias",
  },
];

function subnavButtonClass(active: boolean) {
  return `inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded transition-colors ${
    active
      ? "bg-investep-navy text-white"
      : "text-investep-navy border border-investep-navy/20 hover:bg-investep-cream active:bg-investep-cream/80"
  }`;
}

type Props = {
  activeTab: MarketTab;
  onSelectTab: (tab: MarketTab, href: string) => void;
};

export function MarketSubnav({ activeTab, onSelectTab }: Props) {
  return (
    <div className="mb-4 pb-4 border-b border-investep-navy/20 space-y-2">
      <nav className="flex flex-wrap gap-2" aria-label="Market sections">
        {MARKET_TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              className={subnavButtonClass(active)}
              aria-current={active ? "page" : undefined}
              onClick={() => onSelectTab(tab.id, tab.href)}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
