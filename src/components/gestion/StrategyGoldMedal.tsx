"use client";

export function StrategyGoldMedal({
  className = "",
  title = "Estrategia cumplida al 100%",
}: {
  className?: string;
  title?: string;
}) {
  return (
    <span
      className={`inline-flex items-center justify-center text-2xl leading-none drop-shadow-sm ${className}`.trim()}
      title={title}
      aria-label={title}
      role="img"
    >
      🥇
    </span>
  );
}
