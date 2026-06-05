"use client";

import { useState } from "react";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function calc35(value: number): number {
  return round2(value * 1.35 + 0.02);
}

function calc10(value: number): number {
  return round2(value * 1.1 + 0.02);
}

function calcRisk(value: number): number {
  return round2(value * 0.8);
}

function formatResult(n: number): string {
  return Number.isFinite(n) ? n.toFixed(2) : "—";
}

type PriceCalcProps = {
  variant?: "default" | "sidebar";
};

export function PriceCalc({ variant = "default" }: PriceCalcProps) {
  const [input, setInput] = useState("");
  const [lastLabel, setLastLabel] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<number | null>(null);

  const value = parseFloat(input);
  const valid = Number.isFinite(value);

  function run35() {
    if (!valid) return;
    const r = calc35(value);
    setLastLabel("35%");
    setLastResult(r);
  }

  function run10() {
    if (!valid) return;
    const r = calc10(value);
    setLastLabel("10%");
    setLastResult(r);
  }

  if (variant === "sidebar") {
    const r35 = valid ? calc35(value) : null;
    const r10 = valid ? calc10(value) : null;
    const rRisk = valid ? calcRisk(value) : null;
    const lastIs35 = lastLabel === "35%";
    const lastIs10 = lastLabel === "10%";

    return (
      <div className="space-y-3">
        <input
          type="number"
          step="any"
          inputMode="decimal"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="0.00"
          aria-label="Monto para calcular"
          className="w-full text-base font-medium text-investep-navy bg-white border-0 rounded-lg px-3 py-2.5 shadow-sm placeholder:text-gray-400 focus:ring-2 focus:ring-investep-gold focus:outline-none"
        />

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={run35}
            disabled={!valid}
            className="text-sm font-bold rounded-lg px-2 py-2 bg-investep-gold text-investep-navy disabled:opacity-40 hover:brightness-105 transition-all"
            title="× 1.35 + 0.02"
          >
            35%
          </button>
          <button
            type="button"
            onClick={run10}
            disabled={!valid}
            className="text-sm font-bold rounded-lg px-2 py-2 bg-white/20 text-white border border-white/25 disabled:opacity-40 hover:bg-white/30 transition-all"
            title="× 1.1 + 0.02"
          >
            10%
          </button>
        </div>

        {valid && r35 != null && r10 != null && (
          <div className="grid grid-cols-2 gap-2">
            <div
              className={`rounded-lg px-2 py-2.5 text-center ${
                lastIs35 ? "bg-investep-gold/25 ring-2 ring-investep-gold" : "bg-white/10"
              }`}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wide text-white/70">35%</p>
              <p className="text-xl font-bold tabular-nums text-investep-gold leading-tight mt-0.5">
                {formatResult(r35)}
              </p>
            </div>
            <div
              className={`rounded-lg px-2 py-2.5 text-center ${
                lastIs10 ? "bg-investep-gold/25 ring-2 ring-investep-gold" : "bg-white/10"
              }`}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wide text-white/70">10%</p>
              <p className="text-xl font-bold tabular-nums text-investep-gold leading-tight mt-0.5">
                {formatResult(r10)}
              </p>
            </div>
          </div>
        )}

        <div
          className={`rounded-lg px-2 py-3 text-center border-2 ${
            valid
              ? "bg-red-600/30 border-red-400"
              : "bg-red-950/50 border-red-500/30 opacity-70"
          }`}
        >
          <p className="text-[11px] font-bold uppercase tracking-wide text-red-200">Risk</p>
          <p className="text-[10px] text-red-200/80 mt-0.5">× 0.80</p>
          <p
            className={`text-2xl font-bold tabular-nums leading-tight mt-1 ${
              valid ? "text-red-300" : "text-red-400/50"
            }`}
          >
            {valid && rRisk != null ? formatResult(rRisk) : "—"}
          </p>
        </div>

        {!valid && input.length > 0 && (
          <p className="text-[11px] text-center text-white/50">Ingresa un número válido</p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white border border-investep-gold/50 rounded-lg p-4 space-y-3">
      <p className="text-sm font-semibold text-investep-navy">Calc precio</p>
      <div className="flex flex-wrap gap-2 items-end">
        <label className="text-sm flex-1 min-w-[120px]">
          Valor
          <input
            type="number"
            step="any"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="0.00"
            className="w-full mt-1"
          />
        </label>
        <button
          type="button"
          onClick={run35}
          disabled={!valid}
          className="!bg-investep-gold !text-investep-navy disabled:opacity-40"
          title="input × 1.35 + 0.02"
        >
          35%
        </button>
        <button
          type="button"
          onClick={run10}
          disabled={!valid}
          className="!bg-investep-navy !text-white hover:!bg-investep-navy/90 disabled:opacity-40"
          title="input × 1.1 + 0.02"
        >
          10%
        </button>
      </div>
      <p className="text-xs text-gray-500">
        35%: valor × 1.35 + 0.02 · 10%: valor × 1.1 + 0.02 (redondeo 2 decimales)
      </p>
      {valid && (
        <div className="text-sm space-y-2 pt-1 border-t border-gray-200">
          <div className="grid sm:grid-cols-2 gap-2">
            <p>
              <span className="text-gray-600">35%:</span>{" "}
              <strong className="text-investep-navy">{formatResult(calc35(value))}</strong>
            </p>
            <p>
              <span className="text-gray-600">10%:</span>{" "}
              <strong className="text-investep-navy">{formatResult(calc10(value))}</strong>
            </p>
          </div>
          <p className="rounded-md bg-red-50 border border-red-200 px-2 py-1.5">
            <span className="text-red-700 font-semibold uppercase text-xs tracking-wide">Risk:</span>{" "}
            <strong className="text-red-600 text-lg tabular-nums">{formatResult(calcRisk(value))}</strong>
            <span className="text-red-600/70 text-xs ml-1">(× 0.80)</span>
          </p>
        </div>
      )}
      {lastLabel != null && lastResult != null && (
        <p className="text-sm bg-investep-cream/80 rounded px-2 py-1">
          Último ({lastLabel}): <strong>{formatResult(lastResult)}</strong>
        </p>
      )}
    </div>
  );
}
