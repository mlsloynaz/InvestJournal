"use client";

import type { TickerStrategyCheckItem, TickerStrategyCheckStatus } from "@/lib/movement-ticker-badge-types";

const STATUS_TITLE: Record<TickerStrategyCheckStatus, string> = {
  met: "Cumple",
  not_met: "No cumple",
  partial: "Parcial / cerca",
  pending: "Pendiente",
  about_to_cross: "Por cruzar BB mid (min 2–4)",
};

export function StrategyCheckIcon({
  status,
  title,
}: {
  status: TickerStrategyCheckStatus;
  title?: string;
}) {
  const tip = title ?? STATUS_TITLE[status];

  if (status === "met") {
    return (
      <span className="inline-flex w-3.5 text-green-600 font-bold leading-none" title={tip}>
        ✓
      </span>
    );
  }

  if (status === "about_to_cross") {
    return (
      <span
        className="inline-flex w-3.5 h-3.5 items-center justify-center rounded-full bg-sky-500 text-[7px] font-bold text-white leading-none shrink-0"
        title={tip}
      >
        G
      </span>
    );
  }

  if (status === "partial") {
    return (
      <span className="inline-flex w-3.5 text-amber-600 leading-none" title={tip}>
        ○
      </span>
    );
  }

  if (status === "pending") {
    return (
      <span className="inline-flex w-3.5 text-gray-400 leading-none" title={tip}>
        ·
      </span>
    );
  }

  return (
    <span className="inline-flex w-3.5 text-orange-500 leading-none" title={tip}>
      ○
    </span>
  );
}

type Props = {
  checks: TickerStrategyCheckItem[];
  className?: string;
};

/** Collapsed ticker row — ✓ met · ○ not met (same as BB15 Inside). */
export function TickerStrategyChecks({ checks, className = "" }: Props) {
  if (!checks.length) return null;

  return (
    <span
      className={`inline-flex items-center gap-0.5 shrink-0 ${className}`.trim()}
      title={checks.map((c) => `${c.label}: ${STATUS_TITLE[c.status]}`).join(" · ")}
    >
      {checks.map((check) => (
        <StrategyCheckIcon key={check.id} status={check.status} title={check.label} />
      ))}
    </span>
  );
}

export type { TickerStrategyCheckItem, TickerStrategyCheckStatus };
