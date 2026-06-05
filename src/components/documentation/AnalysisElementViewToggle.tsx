"use client";

import { useCallback, useEffect, useState } from "react";
import type { AnalysisElement } from "@/data/analysis-elements";
import { AnalysisElementView } from "@/components/documentation/AnalysisElementView";

export type ElementViewMode = "normal" | "enhanced";

type Props = {
  normalElement: AnalysisElement;
  enhancedElement: AnalysisElement;
  storageKey?: string;
};

function ToggleButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
        active
          ? "bg-investep-navy text-white shadow-sm"
          : "bg-white text-investep-navy border border-investep-navy/20 hover:border-investep-gold"
      }`}
      aria-pressed={active}
    >
      {label}
    </button>
  );
}

export function AnalysisElementViewToggle({
  normalElement,
  enhancedElement,
  storageKey,
}: Props) {
  const [mode, setMode] = useState<ElementViewMode>("normal");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!storageKey) {
      setHydrated(true);
      return;
    }
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved === "normal" || saved === "enhanced") {
        setMode(saved);
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, [storageKey]);

  const selectMode = useCallback(
    (next: ElementViewMode) => {
      setMode(next);
      if (storageKey) {
        try {
          localStorage.setItem(storageKey, next);
        } catch {
          /* ignore */
        }
      }
    },
    [storageKey],
  );

  const activeElement = mode === "enhanced" ? enhancedElement : normalElement;

  return (
    <div className="space-y-4">
      <div
        className="flex flex-wrap items-center justify-between gap-3 bg-white border-2 border-investep-navy/15 rounded-lg px-4 py-3"
        role="group"
        aria-label="Tipo de vista"
      >
        <p className="text-sm text-gray-600">
          {mode === "enhanced" ? (
            <span>
              Vista <strong className="text-investep-navy">mejorada</strong> — clases Bollinger I y II
            </span>
          ) : (
            <span>
              Vista <strong className="text-investep-navy">normal</strong> — resumen compacto
            </span>
          )}
        </p>
        <div className="flex gap-2 p-1 bg-investep-cream/50 rounded-lg">
          <ToggleButton
            active={mode === "normal"}
            label="Normal"
            onClick={() => selectMode("normal")}
          />
          <ToggleButton
            active={mode === "enhanced"}
            label="Mejorada"
            onClick={() => selectMode("enhanced")}
          />
        </div>
      </div>

      {hydrated ? (
        <AnalysisElementView element={activeElement} />
      ) : (
        <AnalysisElementView element={normalElement} />
      )}
    </div>
  );
}
