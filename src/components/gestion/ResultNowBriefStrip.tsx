"use client";

import type { FinanceAiPremarketAnalysis } from "@/lib/finance-ai-types";
import {
  calendarBriefCheck,
  newsBriefCheck,
  panoramaFromAnalysis,
  resolveFocusStrategyDirection,
  resolveReferencePrice,
  strategyExitLevels,
} from "@/lib/result-now-brief";
import { filterStrategyFits, RESULT_NOW_FOCUS_STRATEGY_IDS } from "@/lib/strategy-display";

function CheckRow({ ok, label, detail }: { ok: boolean; label: string; detail: string }) {
  return (
    <p className={ok ? "text-green-800" : "text-red-800"}>
      <span className="font-medium" aria-hidden>
        {ok ? "✓" : "✗"}
      </span>{" "}
      <span className="text-gray-800">{label}</span>
      <span className="text-gray-600"> · {detail}</span>
    </p>
  );
}

export function ResultNowBriefStrip({
  analysis,
  strategyIdsFilter = RESULT_NOW_FOCUS_STRATEGY_IDS,
}: {
  analysis?: FinanceAiPremarketAnalysis | null;
  strategyIdsFilter?: readonly string[];
}) {
  if (!analysis) return null;

  const calendarGate = analysis.calendarGate ?? analysis.strategyChecklist?.calendarGate;
  const news = analysis.newsSentiment;
  const strategies = filterStrategyFits(analysis.strategyChecklist?.strategies, strategyIdsFilter);
  const direction =
    resolveFocusStrategyDirection(strategies) ??
    resolveFocusStrategyDirection(analysis.strategyChecklist?.strategies);

  const calendar = calendarBriefCheck(calendarGate);
  const newsLine = newsBriefCheck(news, direction);
  const panorama = panoramaFromAnalysis(analysis);
  const price = resolveReferencePrice(panorama);
  const levels = direction
    ? strategyExitLevels(direction, panorama, analysis.keyLevels, price)
    : null;

  if (!calendar && !newsLine && !levels) return null;

  return (
    <div className="rounded border border-slate-200 bg-slate-50/90 px-2 py-1.5 space-y-0.5 text-[11px]">
      {calendar && <CheckRow {...calendar} />}
      {newsLine && <CheckRow {...newsLine} />}
      {levels && (
        <p className="text-slate-800">
          <span className="font-medium">{levels.direction}</span>
          <span className="text-gray-600">
            {" "}
            · {levels.targetLabel}
            {levels.targetPrice != null && ` $${levels.targetPrice.toFixed(2)}`}
            {levels.targetDistancePct != null &&
              ` (${levels.direction === "PUT" ? "-" : "+"}${levels.targetDistancePct.toFixed(1)}%)`}
            {levels.stopPrice != null && ` · ${levels.stopLabel} $${levels.stopPrice.toFixed(2)}`}
          </span>
          <span className="block text-gray-500 mt-0.5">{levels.horizonNote}</span>
        </p>
      )}
    </div>
  );
}
