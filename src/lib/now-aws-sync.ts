import type { NowPollIntervalSelection } from "@/lib/now-polling-session";

export const NOW_MINUTE_RULE_NAME = "finance-ai-now-minute-et";

export const NOW_GROUP_IDS = [
  "tickers-now-1",
  "tickers-now-5",
  "tickers-now-10",
  "tickers-now-30",
  "tickers-now-1h",
] as const;

export type NowGroupId = (typeof NOW_GROUP_IDS)[number];

export function intervalToNowGroupId(
  interval: NowPollIntervalSelection
): NowGroupId | null {
  switch (interval) {
    case "1":
      return "tickers-now-1";
    case "5":
      return "tickers-now-5";
    case "10":
      return "tickers-now-10";
    case "30":
      return "tickers-now-30";
    case "1h":
      return "tickers-now-1h";
    default:
      return null;
  }
}

export function buildNowGroupsPayload(
  rows: { symbol: string; pollInterval: NowPollIntervalSelection }[]
): Record<string, { enabled: boolean; symbols: string[] }> {
  const groups: Record<string, { enabled: boolean; symbols: string[] }> = {};
  for (const groupId of NOW_GROUP_IDS) {
    groups[groupId] = { enabled: true, symbols: [] };
  }
  for (const row of rows) {
    const groupId = intervalToNowGroupId(row.pollInterval);
    if (!groupId) continue;
    groups[groupId].symbols.push(row.symbol.trim().toUpperCase());
  }
  return groups;
}
