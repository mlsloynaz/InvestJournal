"use client";

import { useState, useTransition } from "react";
import { formatCalcResult } from "@/lib/price-calc";
import { formatMinMaxLabel, formatRangoOptimoLabel } from "@/lib/rango-optimo-display";
import { lookupRangoOptimo } from "@/server/actions/rango-optimo";

type RangoOptimoLookupProps = {
  variant?: "default" | "sidebar";
};

type LookupState = {
  symbol: string;
  rangoLabel: string;
  minMaxLabel: string | null;
  priceOptimo: number | null;
  rangeLow: number | null;
  rangeHigh: number | null;
};

export function RangoOptimoLookup({ variant = "default" }: RangoOptimoLookupProps) {
  const [symbol, setSymbol] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LookupState | null>(null);
  const [pending, startTransition] = useTransition();

  function onLookup() {
    const trimmed = symbol.trim();
    if (!trimmed) {
      setError("Ingresa un ticker.");
      setResult(null);
      return;
    }

    setError(null);
    startTransition(async () => {
      const response = await lookupRangoOptimo(trimmed);
      if (!response.success) {
        setResult(null);
        setError(response.error ?? "No encontrado.");
        return;
      }
      setResult({
        symbol: response.symbol ?? trimmed.toUpperCase(),
        rangoLabel: formatRangoOptimoLabel({
          rangoOptimoLow: response.rangoOptimoLow ?? null,
          rangoOptimoHigh: response.rangoOptimoHigh ?? null,
          priceOptimo: response.priceOptimo ?? null,
        }),
        minMaxLabel: formatMinMaxLabel({
          minPrice: response.minPrice ?? null,
          maxPrice: response.maxPrice ?? null,
        }),
        priceOptimo: response.priceOptimo ?? null,
        rangeLow: response.rangeLow ?? null,
        rangeHigh: response.rangeHigh ?? null,
      });
    });
  }

  if (variant === "sidebar") {
    return (
      <div className="space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            onKeyDown={(e) => {
              if (e.key === "Enter") onLookup();
            }}
            placeholder="NVDA"
            aria-label="Ticker para rango óptimo"
            className="flex-1 min-w-0 text-base font-medium text-investep-navy bg-white border-0 rounded-lg px-3 py-2.5 shadow-sm placeholder:text-gray-400 focus:ring-2 focus:ring-investep-gold focus:outline-none uppercase"
          />
          <button
            type="button"
            onClick={onLookup}
            disabled={pending}
            className="text-sm font-bold rounded-lg px-3 py-2 bg-investep-gold text-investep-navy disabled:opacity-40 hover:brightness-105 transition-all shrink-0"
          >
            {pending ? "…" : "Ver"}
          </button>
        </div>

        {error && <p className="text-[11px] text-center text-red-300">{error}</p>}

        {result && (
          <div className="space-y-2">
            <p className="text-center text-sm font-bold text-investep-gold">{result.symbol}</p>
            <div className="rounded-lg px-2 py-2.5 text-center bg-investep-gold/25 ring-2 ring-investep-gold">
              <p className="text-[9px] font-bold uppercase tracking-wide text-white/70">
                Rango óptimo
              </p>
              <p className="text-sm font-bold tabular-nums text-investep-gold mt-0.5">
                {result.rangoLabel}
              </p>
            </div>
            {result.minMaxLabel ? (
              <div className="rounded-lg px-2 py-2 text-center bg-white/10">
                <p className="text-[9px] font-bold uppercase tracking-wide text-white/70">
                  Mín / Máx
                </p>
                <p className="text-xs font-semibold tabular-nums text-white/90 mt-0.5">
                  {result.minMaxLabel}
                </p>
              </div>
            ) : null}
          </div>
        )}

        {!result && !error && (
          <p className="text-[11px] text-center text-white/50">Ticker → rango de strike</p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white border border-investep-gold/50 rounded-lg p-4 space-y-3">
      <p className="text-sm font-semibold text-investep-navy">Rango óptimo</p>
      <div className="flex flex-wrap gap-2 items-end">
        <label className="text-sm flex-1 min-w-[120px]">
          Ticker
          <input
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            onKeyDown={(e) => {
              if (e.key === "Enter") onLookup();
            }}
            placeholder="NVDA"
            className="w-full mt-1 uppercase"
          />
        </label>
        <button type="button" onClick={onLookup} disabled={pending}>
          {pending ? "…" : "Buscar"}
        </button>
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}
      {result && (
        <div className="text-sm space-y-2 pt-1 border-t border-gray-200">
          <p className="rounded-md bg-investep-cream/80 px-2 py-1.5">
            <span className="text-gray-600">Rango óptimo:</span>{" "}
            <strong className="text-investep-navy tabular-nums">{result.rangoLabel}</strong>
          </p>
          {result.minMaxLabel ? (
            <p className="rounded-md bg-slate-50 border border-slate-200 px-2 py-1.5">
              <span className="text-gray-600">Mínimo y máximo:</span>{" "}
              <strong className="text-investep-navy tabular-nums">{result.minMaxLabel}</strong>
            </p>
          ) : null}
          {result.priceOptimo != null ? (
            <p className="text-xs text-gray-500">
              Punto medio: {formatCalcResult(result.priceOptimo)}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
