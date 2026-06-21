export type TickerStrategyCheckStatus =
  | "met"
  | "not_met"
  | "partial"
  | "pending"
  | "about_to_cross";

export type TickerStrategyCheckItem = {
  id: string;
  label: string;
  status: TickerStrategyCheckStatus;
};

/** @deprecated use TickerStrategyCheckItem */
export type CollapsedRuleIconItem = {
  id: string;
  label: string;
  met?: boolean;
  pending?: boolean;
  probable?: boolean;
  aboutToCross?: boolean;
};

export type CollapsedProgressBadge = {
  pct: number | null;
  premarketLabel: string;
  lastCheckLabel?: string | null;
  progressLine: string;
};

export type DecisionTimingView = {
  label: string;
  className: string;
  title?: string;
};
