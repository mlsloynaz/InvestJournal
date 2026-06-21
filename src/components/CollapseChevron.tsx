"use client";

type ChevronProps = {
  /** Controlled rotation (gestion panels). Omit for `<details group-open>` usage. */
  open?: boolean;
  className?: string;
};

export function CollapseChevron({ open, className = "" }: ChevronProps) {
  const rotateClass =
    open !== undefined ? (open ? "rotate-180" : "") : "group-open:rotate-180";

  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden
      className={`transition-transform duration-200 ${rotateClass} ${className}`.trim()}
    >
      <path
        d="M5 7.5L10 12.5L15 7.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type ToggleProps = {
  open: boolean;
  onToggle: () => void;
  className?: string;
};

/** Chevron toggle — same affordance as config CollapsibleConfigSection. */
export function CollapseToggleButton({ open, onToggle, className = "" }: ToggleProps) {
  return (
    <button
      type="button"
      suppressHydrationWarning
      className={`p-1.5 rounded text-investep-navy hover:bg-slate-50 inline-flex shrink-0 ${className}`.trim()}
      aria-expanded={open}
      aria-label={open ? "Ocultar" : "Mostrar"}
      onClick={onToggle}
    >
      <CollapseChevron open={open} />
    </button>
  );
}
