"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import type { AnalysisElement, AnalysisSection } from "@/data/analysis-elements";
import {
  PREMARKET_CHECKLIST_STOPS,
  PREMARKET_PHASE_LABELS,
  type PremarketChecklistStop,
} from "@/data/premarket-checklist-stops";
import { AnalysisSectionBlock } from "@/components/documentation/AnalysisSectionBlock";
import { PremarketRoadMap } from "@/components/documentation/PremarketRoadMap";

function renderStopSections(
  stop: PremarketChecklistStop,
  sections: AnalysisSection[],
): ReactNode {
  return stop.sectionIndices.map((index) => {
    const section = sections[index];
    if (!section) return null;

    if (stop.hideStepTitle && section.type === "steps") {
      return (
        <AnalysisSectionBlock
          key={index}
          section={{ ...section, title: "" }}
        />
      );
    }

    return <AnalysisSectionBlock key={index} section={section} />;
  });
}

export function PremarketChecklistView({ element }: { element: AnalysisElement }) {
  const stops = PREMARKET_CHECKLIST_STOPS;
  const [activeIndex, setActiveIndex] = useState(0);
  const [visited, setVisited] = useState<Set<number>>(() => new Set([0]));

  const activeStop = stops[activeIndex];
  const progress = Math.round(((activeIndex + 1) / stops.length) * 100);

  const goTo = useCallback(
    (index: number) => {
      const next = Math.max(0, Math.min(index, stops.length - 1));
      setActiveIndex(next);
      setVisited((prev) => new Set(prev).add(next));
    },
    [stops.length],
  );

  const goPrev = () => goTo(activeIndex - 1);
  const goNext = () => goTo(activeIndex + 1);

  const stopsByPhase = useMemo(() => {
    const groups: { phase: PremarketChecklistStop["phase"]; items: { stop: PremarketChecklistStop; index: number }[] }[] =
      [];
    stops.forEach((stop, index) => {
      const last = groups[groups.length - 1];
      if (last?.phase === stop.phase) {
        last.items.push({ stop, index });
      } else {
        groups.push({ phase: stop.phase, items: [{ stop, index }] });
      }
    });
    return groups;
  }, [stops]);

  return (
    <div className="space-y-5">
      <header className="bg-white border-2 border-investep-navy/15 rounded-xl p-5">
        <div className="flex flex-wrap items-start gap-3 justify-between">
          <div>
            <p className="text-xs font-semibold text-investep-gold uppercase tracking-widest mb-1">
              Ruta pre-market
            </p>
            <h1 className="text-2xl font-bold text-investep-navy">{element.title}</h1>
            <p className="text-sm text-gray-600 mt-1">{element.tagline}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-investep-gold">{progress}%</p>
            <p className="text-xs text-gray-500">
              Parada {activeIndex + 1} de {stops.length}
            </p>
          </div>
        </div>
        <div className="mt-4 h-2 bg-investep-navy/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-investep-gold transition-all duration-300 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      <PremarketRoadMap
        stops={stops}
        activeIndex={activeIndex}
        visited={visited}
        onSelect={goTo}
      />

      <div className="lg:hidden flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x snap-mandatory">
        {stops.map((stop, index) => {
          const isActive = index === activeIndex;
          return (
            <button
              key={stop.id}
              type="button"
              onClick={() => goTo(index)}
              className={`snap-start shrink-0 flex flex-col items-center gap-1 rounded-xl px-3 py-2 min-w-[4.5rem] border-2 transition-all ${
                isActive
                  ? "border-investep-gold bg-investep-navy text-white shadow-md"
                  : "border-investep-navy/15 bg-white text-gray-700"
              }`}
            >
              <span className="text-lg">{stop.icon}</span>
              <span className="text-[10px] font-bold uppercase">{stop.shortLabel}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col lg:flex-row gap-5">
        <nav
          className="hidden lg:block lg:w-56 shrink-0 bg-white border-2 border-investep-navy/15 rounded-xl p-3 max-h-[420px] lg:max-h-none overflow-y-auto"
          aria-label="Paradas del checklist"
        >
          <p className="text-xs font-semibold text-investep-navy uppercase tracking-wide px-2 mb-2">
            Paradas
          </p>
          <ul className="space-y-3">
            {stopsByPhase.map((group) => (
              <li key={group.phase}>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2 mb-1">
                  {PREMARKET_PHASE_LABELS[group.phase]}
                </p>
                <ul className="space-y-0.5">
                  {group.items.map(({ stop, index }) => {
                    const isActive = index === activeIndex;
                    const isDone = visited.has(index) && !isActive;

                    return (
                      <li key={stop.id}>
                        <button
                          type="button"
                          onClick={() => goTo(index)}
                          className={`w-full flex items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-all ${
                            isActive
                              ? "bg-investep-navy text-white shadow-md"
                              : isDone
                                ? "bg-green-50 text-green-900 hover:bg-green-100"
                                : "text-gray-700 hover:bg-investep-cream/50"
                          }`}
                        >
                          <span
                            className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs ${
                              isActive
                                ? "bg-investep-gold text-investep-navy"
                                : isDone
                                  ? "bg-green-500 text-white"
                                  : "bg-investep-navy/10"
                            }`}
                          >
                            {isDone ? "✓" : stop.icon}
                          </span>
                          <span className="leading-tight font-medium truncate">{stop.shortLabel}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ul>
        </nav>

        <article className="flex-1 min-w-0 bg-investep-cream/40 border-2 border-investep-gold/30 rounded-xl overflow-hidden">
          <div className="bg-investep-navy px-5 py-4 flex items-center gap-3">
            <span className="text-2xl" aria-hidden>
              {activeStop.icon}
            </span>
            <div>
              <p className="text-[10px] font-bold text-investep-gold uppercase tracking-wider">
                {PREMARKET_PHASE_LABELS[activeStop.phase]}
              </p>
              <h2 className="text-lg font-bold text-white">{activeStop.label}</h2>
            </div>
          </div>

          <div className="p-5 space-y-5">
            {renderStopSections(activeStop, element.sections)}
          </div>

          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-investep-navy/10 bg-white px-5 py-4">
            <button
              type="button"
              onClick={goPrev}
              disabled={activeIndex === 0}
              className="px-4 py-2 rounded-lg text-sm font-semibold border-2 border-investep-navy/20 text-investep-navy disabled:opacity-40 disabled:cursor-not-allowed hover:border-investep-gold hover:text-investep-gold transition-colors"
            >
              ← Anterior
            </button>

            <div className="flex gap-1.5 flex-wrap justify-center">
              {stops.map((stop, i) => (
                <button
                  key={stop.id}
                  type="button"
                  onClick={() => goTo(i)}
                  title={stop.label}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    i === activeIndex
                      ? "bg-investep-gold scale-125"
                      : visited.has(i)
                        ? "bg-green-400"
                        : "bg-gray-300 hover:bg-gray-400"
                  }`}
                  aria-label={stop.label}
                  aria-current={i === activeIndex ? "step" : undefined}
                />
              ))}
            </div>

            {activeIndex < stops.length - 1 ? (
              <button
                type="button"
                onClick={goNext}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-investep-gold text-investep-navy hover:bg-investep-gold/90 transition-colors"
              >
                Siguiente →
              </button>
            ) : (
              <button
                type="button"
                onClick={() => goTo(0)}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors"
              >
                ✓ Reiniciar ruta
              </button>
            )}
          </footer>
        </article>
      </div>
    </div>
  );
}
