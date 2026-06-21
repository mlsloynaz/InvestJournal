"use client";

import { useCallback, useEffect, useState } from "react";
import { rewriteStrategyDocAssetUrl, type StrategyPicItem } from "@/lib/strategy-docs-shared";

const TIMEFRAME_STYLE: Record<string, string> = {
  Dia: "bg-investep-navy text-white",
  Hora: "bg-investep-gold text-investep-navy",
  "15 min": "bg-emerald-700 text-white",
  Chart: "bg-gray-600 text-white",
};

function gridClass(count: number): string {
  if (count === 1) return "grid-cols-1 max-w-2xl";
  if (count === 2) return "grid-cols-1 md:grid-cols-2";
  if (count === 3) return "grid-cols-1 md:grid-cols-3";
  return "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4";
}

export function StrategyDocPicsGallery({ pics }: { pics: StrategyPicItem[] }) {
  const [active, setActive] = useState<StrategyPicItem | null>(null);

  const close = useCallback(() => setActive(null), []);

  useEffect(() => {
    if (!active) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, close]);

  if (pics.length === 0) return null;

  return (
    <>
      <section className="rounded-xl border border-investep-navy/15 bg-white shadow-sm overflow-hidden">
        <header className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 border-b border-investep-navy/10 bg-investep-cream/60">
          <div>
            <h2 className="text-base font-semibold text-investep-navy">Graficos de referencia</h2>
            <p className="text-xs text-gray-600 mt-0.5">Clic en una imagen para ampliar</p>
          </div>
          <span className="text-xs font-medium text-investep-navy/70 tabular-nums">
            {pics.length} {pics.length === 1 ? "grafico" : "graficos"}
          </span>
        </header>

        <ul className={`grid gap-4 p-4 ${gridClass(pics.length)}`}>
          {pics.map((pic) => {
            const badgeClass = TIMEFRAME_STYLE[pic.timeframe] ?? TIMEFRAME_STYLE.Chart;
            const src = rewriteStrategyDocAssetUrl(pic.file);

            return (
              <li key={pic.filename}>
                <button
                  type="button"
                  onClick={() => setActive(pic)}
                  className="group w-full text-left rounded-lg border border-investep-navy/15 bg-white shadow-sm hover:shadow-md hover:border-investep-gold/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-investep-gold transition-all overflow-hidden"
                >
                  <div className="relative flex items-center justify-center bg-gradient-to-b from-slate-100 to-slate-200/80 p-3 min-h-[200px]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src}
                      alt={pic.label}
                      className="max-h-[240px] w-full object-contain drop-shadow-sm group-hover:scale-[1.02] transition-transform duration-200"
                      loading="lazy"
                    />
                    <span className="absolute top-2 right-2 rounded-md bg-black/55 text-white text-[10px] font-medium px-2 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      Ampliar
                    </span>
                  </div>
                  <div className="flex items-start gap-2 px-3 py-2.5 border-t border-investep-navy/10 bg-white">
                    <span
                      className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${badgeClass}`}
                    >
                      {pic.timeframe}
                    </span>
                    <span className="text-sm font-medium text-investep-navy leading-snug">{pic.label}</span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {active ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={active.label}
          onClick={close}
        >
          <div
            className="relative max-w-[min(96vw,1400px)] max-h-[92vh] flex flex-col"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={close}
              className="absolute -top-2 -right-2 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white text-investep-navy shadow-lg hover:bg-investep-cream focus:outline-none focus-visible:ring-2 focus-visible:ring-investep-gold text-lg leading-none"
              aria-label="Cerrar"
            >
              {"\u00d7"}
            </button>
            <div className="rounded-xl overflow-hidden bg-slate-900 shadow-2xl border border-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={rewriteStrategyDocAssetUrl(active.file)}
                alt={active.label}
                className="block max-w-full max-h-[calc(92vh-4rem)] w-auto h-auto mx-auto object-contain"
              />
            </div>
            <p className="mt-3 text-center text-sm text-white/90 font-medium">{active.label}</p>
            <p className="text-center text-xs text-white/60">{active.timeframe}</p>
          </div>
        </div>
      ) : null}
    </>
  );
}
