"use client";

import type { PremarketChecklistStop } from "@/data/premarket-checklist-stops";

type Props = {
  stops: PremarketChecklistStop[];
  activeIndex: number;
  visited: Set<number>;
  onSelect: (index: number) => void;
};

export function PremarketRoadMap({ stops, activeIndex, visited, onSelect }: Props) {
  const n = stops.length;
  const width = 720;
  const height = 88;
  const padX = 36;
  const y = 44;

  const points = stops.map((_, i) => {
    const t = n <= 1 ? 0.5 : i / (n - 1);
    return { x: padX + t * (width - padX * 2), y: y + Math.sin(t * Math.PI * 2.2) * 10 };
  });

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");

  return (
    <div className="bg-investep-navy rounded-xl p-3 sm:p-4 overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full min-w-[520px] h-auto"
        role="img"
        aria-label="Ruta del checklist pre-market"
      >
        <path
          d={pathD}
          fill="none"
          stroke="#334155"
          strokeWidth={14}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={pathD}
          fill="none"
          stroke="#ca8a04"
          strokeWidth={2}
          strokeDasharray="8 6"
          strokeLinecap="round"
        />
        {points.map((p, i) => {
          const stop = stops[i];
          const isActive = i === activeIndex;
          const isDone = visited.has(i) && !isActive;
          const r = isActive ? 16 : 13;

          return (
            <g key={stop.id} className="cursor-pointer" onClick={() => onSelect(i)}>
              {isActive && (
                <circle cx={p.x} cy={p.y} r={22} fill="#ca8a04" opacity={0.25} />
              )}
              <circle
                cx={p.x}
                cy={p.y}
                r={r}
                fill={isActive ? "#ca8a04" : isDone ? "#22c55e" : "#0f2744"}
                stroke={isActive ? "#fef08a" : isDone ? "#bbf7d0" : "#64748b"}
                strokeWidth={2}
              />
              <text
                x={p.x}
                y={p.y + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={isActive ? 14 : 12}
              >
                {isDone ? "✓" : stop.icon}
              </text>
              <text
                x={p.x}
                y={p.y + 28}
                textAnchor="middle"
                fill={isActive ? "#fef08a" : "#94a3b8"}
                fontSize={9}
                fontWeight={isActive ? 700 : 500}
              >
                {stop.shortLabel}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="text-center text-xs text-investep-gold/80 mt-1 sm:hidden">
        Desliza la ruta · toca una parada para saltar
      </p>
    </div>
  );
}
