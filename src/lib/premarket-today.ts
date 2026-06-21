import { effectiveTradingDateEt, tradingDateEt } from "@/lib/live-session-window";



export type PremarketTodayRef = {

  premarketAt?: string | null;

  premarketDate?: string | null;

};



export function hasPremarketTodayForTicker(financeAi?: PremarketTodayRef | null): boolean {

  const today = effectiveTradingDateEt();

  if (financeAi?.premarketDate === today) return true;

  if (financeAi?.premarketAt) {

    return tradingDateEt(new Date(financeAi.premarketAt)) === today;

  }

  return false;

}


