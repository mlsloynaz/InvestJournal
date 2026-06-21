"use client";



import type { ReactNode } from "react";

import { TickerStrategyChecks } from "@/components/gestion/TickerStrategyChecks";

import { resolveBb15ScoreColorStyle } from "@/lib/bb15-fast-display";

import type {

  CollapsedProgressBadge,

  DecisionTimingView,

  TickerStrategyCheckItem,

} from "@/lib/movement-ticker-badge-types";



export type { CollapsedProgressBadge, CollapsedRuleIconItem, DecisionTimingView, TickerStrategyCheckItem };

export type { TickerStrategyCheckStatus } from "@/lib/movement-ticker-badge-types";



export { StrategyCheckIcon, TickerStrategyChecks } from "@/components/gestion/TickerStrategyChecks";



export function CollapsedProgressLine({ badge }: { badge: CollapsedProgressBadge }) {

  const colors = resolveBb15ScoreColorStyle(badge.pct, badge.pct == null);

  const pctText = badge.pct != null ? `${badge.pct}%` : "—";



  return (

    <span

      className="text-[10px] font-normal text-gray-600 tabular-nums min-w-0"

      title={badge.progressLine}

    >

      <span className="text-gray-400">-</span>{" "}

      <span className={`font-semibold ${colors.text}`}>{pctText}</span>

      <span className="text-gray-400"> - {badge.premarketLabel}</span>

      {badge.lastCheckLabel && (

        <>

          <span className="text-gray-300"> | </span>

          <span className="text-gray-600">{badge.lastCheckLabel}</span>

        </>

      )}

    </span>

  );

}



export function DecisionTimingBadge({ timing }: { timing: DecisionTimingView }) {

  return (

    <span

      className={`text-[9px] font-semibold px-1.5 py-px rounded border shrink-0 ${timing.className}`}

      title={timing.title}

    >

      {timing.label}

    </span>

  );

}



export function AboutToCrossGoBadge({ title }: { title?: string }) {

  return (

    <span

      className="inline-flex items-center gap-0.5 rounded px-1 py-px bg-white border border-sky-200 shrink-0"

      title={title ?? "Por cruzar — BB mid min 2–4"}

    >

      <span className="inline-flex w-3.5 h-3.5 items-center justify-center rounded-full text-[7px] font-bold text-white bg-sky-500">

        G

      </span>

      <span className="text-[9px] font-semibold text-sky-700">por cruzar</span>

    </span>

  );

}



export type TickerCollapsedSummaryBadgeProps = {

  price?: number | null;

  direction?: string | null;

  directionArrow: ReactNode;

  timing: DecisionTimingView;

  checks: TickerStrategyCheckItem[];

  checksPending?: boolean;

  progress: CollapsedProgressBadge | null;

  aboutToCross?: boolean;

  aboutToCrossTitle?: string;

};



/** Collapsed ticker summary line shared by BB15 and E03 panels. */

export function TickerCollapsedSummaryBadge({

  price,

  directionArrow,

  timing,

  checks,

  checksPending,

  progress,

  aboutToCross,

  aboutToCrossTitle,

}: TickerCollapsedSummaryBadgeProps) {

  return (

    <>

      {price != null && (

        <span className="text-[10px] font-normal text-gray-500 tabular-nums">

          ${price.toFixed(2)}

        </span>

      )}

      {directionArrow}

      <DecisionTimingBadge timing={timing} />

      {!checksPending && checks.length > 0 && <TickerStrategyChecks checks={checks} />}

      {aboutToCross && <AboutToCrossGoBadge title={aboutToCrossTitle} />}

      {progress && <CollapsedProgressLine badge={progress} />}

    </>

  );

}


