"use client";

import type { ReactNode } from "react";
import { CollapseToggleButton } from "@/components/CollapseChevron";

type Props = {
  id: string;
  title: ReactNode;
  subtitle?: string;
  headerExtra?: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collapsible?: boolean;
  borderClass?: string;
  headerClass?: string;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
};

export function CollapsibleResultSection({
  id,
  title,
  subtitle,
  headerExtra,
  open,
  onOpenChange,
  collapsible = true,
  borderClass = "border-gray-200",
  headerClass = "bg-slate-50/80",
  className = "",
  bodyClassName = "px-4 py-3",
  children,
}: Props) {
  const bodyOpen = collapsible ? open : true;
  return (
    <section
      id={id}
      className={`bg-white border ${borderClass} overflow-hidden scroll-mt-4 ${className || "rounded-xl shadow-sm"}`.trim()}
    >
      <div className={`px-3 py-2 border-b ${headerClass} flex flex-wrap items-center justify-between gap-2`}>
        <div className="min-w-0">
          <h2 className="font-semibold text-investep-navy text-sm flex items-center gap-1.5 flex-wrap">{title}</h2>
          {subtitle && <p className="text-xs text-gray-600 mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {headerExtra}
          {collapsible && (
            <CollapseToggleButton open={open} onToggle={() => onOpenChange(!open)} />
          )}
        </div>
      </div>
      {bodyOpen && <div className={bodyClassName}>{children}</div>}
    </section>
  );
}

export function TickerResultDetails({
  symbol,
  name,
  medal,
  badge,
  defaultOpen = false,
  children,
}: {
  symbol: string;
  name?: string | null;
  medal?: ReactNode;
  badge?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details
      className="rounded-lg border border-gray-200 bg-slate-50/40 overflow-hidden group"
      open={defaultOpen}
    >
      <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-investep-navy flex flex-wrap items-center gap-2 list-none [&::-webkit-details-marker]:hidden">
        <span className="select-none text-gray-400 group-open:rotate-90 transition-transform inline-block">
          ▸
        </span>
        {medal}
        <span>{symbol}</span>
        {name && <span className="font-normal text-gray-500">{name}</span>}
        {badge}
      </summary>
      <div className="px-3 pb-3 border-t border-gray-100">{children}</div>
    </details>
  );
}
