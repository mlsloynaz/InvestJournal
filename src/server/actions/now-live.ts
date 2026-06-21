"use server";



import { tradingDateEt } from "@/lib/live-session-window";

import type {

  FinanceAiNowPollingStatus,

  FinanceAiPremarketAnalysis,

  FinanceAiTickerContext,

} from "@/lib/finance-ai-types";

import {

  getNowPollingStatus,

  getPremarket,

  getTickerContext,

  isFinanceAiConfigured,

} from "@/server/services/finance-ai-client";

import { analysisForStrategyEval } from "@/lib/premarket-display";



export type NowLiveTickerSnapshot = {

  symbol: string;

  analysis: FinanceAiPremarketAnalysis | null;

  context: FinanceAiTickerContext | null;

  awsTicker?: FinanceAiNowPollingStatus["tickers"] extends Record<string, infer T> ? T : never;

};



export type NowLiveDashboardPayload = {

  tradeDate: string;

  checkedAt: string;

  nowPolling: FinanceAiNowPollingStatus | null;

  tickers: NowLiveTickerSnapshot[];

};



export async function fetchNowLiveDashboard(

  symbols: string[]

): Promise<{ success: boolean; data?: NowLiveDashboardPayload; error?: string }> {

  if (!isFinanceAiConfigured()) {

    return { success: false, error: "FinanceAI no configurado" };

  }



  const tradeDate = tradingDateEt();

  const nowResult = await getNowPollingStatus();

  const nowPolling = nowResult.ok ? nowResult.data : null;



  const unique = [...new Set(symbols.map((s) => s.trim().toUpperCase()).filter(Boolean))];



  const tickers = await Promise.all(

    unique.map(async (symbol) => {

      const [pm, ctx] = await Promise.all([

        getPremarket(symbol, tradeDate),

        getTickerContext(symbol),

      ]);

      const raw = pm.ok ? pm.data : null;

      return {

        symbol,

        analysis: analysisForStrategyEval(raw),

        context: ctx.ok ? ctx.data : null,

        awsTicker: nowPolling?.tickers?.[symbol],

      };

    })

  );



  return {

    success: true,

    data: {

      tradeDate,

      checkedAt: new Date().toISOString(),

      nowPolling,

      tickers,

    },

  };

}


