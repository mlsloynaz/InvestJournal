import {
  MARKET_BB15_TAB,
  MARKET_TESTING_CRITERIAS_TAB,
} from "@/lib/tools-paths";

export type MarketTab = "context" | "bb15" | "testing-criterias";

export function resolveMarketTabFromSearch(
  params: Record<string, string | string[] | undefined>
): MarketTab {
  const raw = params.tab;
  const tab = typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  if (tab === MARKET_BB15_TAB) return "bb15";
  if (tab === MARKET_TESTING_CRITERIAS_TAB) return "testing-criterias";
  return "context";
}

export function resolveMarketTab(searchParams: URLSearchParams | null): MarketTab {
  const tab = searchParams?.get("tab");
  if (tab === MARKET_BB15_TAB) return "bb15";
  if (tab === MARKET_TESTING_CRITERIAS_TAB) return "testing-criterias";
  return "context";
}
