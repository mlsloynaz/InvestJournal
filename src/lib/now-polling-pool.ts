import type { FinanceAiNowPollingStatus } from "@/lib/finance-ai-types";

import { hasPremarketTodayForTicker } from "@/lib/premarket-today";



export type NowPoolTickerRef = {

  symbol: string;

  financeAi?: {

    status?: string | null;

    liveEligible?: boolean;

    premarketAt?: string | null;

    premarketDate?: string | null;

  };

};



export function selectLivePoolTickers(list: NowPoolTickerRef[]): NowPoolTickerRef[] {

  return list.filter(

    (t) =>

      t.financeAi?.status === "ready" &&

      t.financeAi?.liveEligible &&

      hasPremarketTodayForTicker(t.financeAi)

  );

}



export function resolveNowPollingSymbols(

  tickers: NowPoolTickerRef[],

  nowStatus?: FinanceAiNowPollingStatus | null

): string[] {

  const symbols = new Set<string>();



  for (const t of selectLivePoolTickers(tickers)) {

    symbols.add(t.symbol.toUpperCase());

  }



  for (const sym of nowStatus?.manualEnrolled ?? []) {

    if (sym?.trim()) symbols.add(sym.trim().toUpperCase());

  }



  if (nowStatus?.tickers) {

    for (const [sym, row] of Object.entries(nowStatus.tickers)) {

      if (row.manualNow) symbols.add(sym.toUpperCase());

    }

  }



  const recent = nowStatus?.recentRuns?.[0];

  if (recent?.symbols) {

    for (const sym of recent.symbols) {

      if (sym?.trim()) symbols.add(sym.trim().toUpperCase());

    }

  }



  if (nowStatus?.profiles) {

    for (const profile of Object.values(nowStatus.profiles)) {

      for (const sym of profile.symbols ?? []) {

        if (sym?.trim()) symbols.add(sym.trim().toUpperCase());

      }

    }

  }



  return [...symbols].sort();

}



export function isNowPollingActive(nowStatus?: FinanceAiNowPollingStatus | null): boolean {

  if (!nowStatus) return false;

  if ((nowStatus.manualEnrolled?.length ?? 0) > 0) return true;

  if (nowStatus.tickers) {

    return Object.values(nowStatus.tickers).some((t) => t.manualNow);

  }

  return false;

}


