"use client";

import { useEffect, useRef, type ReactNode, type SyntheticEvent } from "react";
import { CollapseChevron } from "@/components/CollapseChevron";

type Props = {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  headerExtra?: ReactNode;
  /** Hide headerExtra while the section is collapsed (CSS-only). */
  headerExtraWhenOpenOnly?: boolean;
  children: ReactNode;
};

function stopSummaryToggle(e: SyntheticEvent) {
  e.preventDefault();
  e.stopPropagation();
}

/** Prevent `<details>` from toggling when clicking controls inside `<summary>`. */
function summaryControlProps() {
  return {
    onMouseDown: stopSummaryToggle,
    onClick: (e: SyntheticEvent) => e.stopPropagation(),
    onKeyDown: stopSummaryToggle,
  } as const;
}

export function CollapsibleConfigSection({
  title,
  subtitle,
  defaultOpen = true,
  headerExtra,
  headerExtraWhenOpenOnly = false,
  children,
}: Props) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    if (detailsRef.current) {
      detailsRef.current.open = defaultOpen;
    }
  }, [defaultOpen]);

  return (
    <details
      ref={detailsRef}
      className="group bg-white border rounded-lg overflow-hidden"
    >
      <summary className="flex flex-wrap items-start justify-between gap-3 px-4 py-3 border-b border-gray-100 list-none cursor-pointer select-none [&::-webkit-details-marker]:hidden">
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-investep-navy">{title}</h2>
          {subtitle ? <p className="text-xs text-gray-600 mt-1">{subtitle}</p> : null}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {headerExtra ? (
            <div
              className={
                headerExtraWhenOpenOnly
                  ? "hidden group-open:flex group-open:flex-wrap group-open:items-center group-open:gap-2"
                  : undefined
              }
              {...summaryControlProps()}
            >
              {headerExtra}
            </div>
          ) : null}
          <span
            className="p-1.5 rounded text-investep-navy hover:bg-slate-50 inline-flex"
            aria-hidden
          >
            <CollapseChevron />
          </span>
        </div>
      </summary>
      <div className="p-4 space-y-3">{children}</div>
    </details>
  );
}
