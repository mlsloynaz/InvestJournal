"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { RangoOptimoEntry } from "@/server/actions/rango-optimo";
import { setFinanceAiBolinger15Tickers } from "@/server/actions/finance-ai-schedules";
import { formatMinMaxLabel, formatRangoOptimoLabel } from "@/lib/rango-optimo-display";
import { CollapsibleConfigSection } from "@/components/config/CollapsibleConfigSection";

type Props = {
  configured: boolean;
  rangoOptimoRows: RangoOptimoEntry[];
  initialBb15Tickers: string[];
  lastImportDate?: string | null;
};

function buildInitialSelection(
  initialBb15Tickers: string[],
  rangoOptimoRows: RangoOptimoEntry[]
): Set<string> {
  const rangoSymbols = new Set(rangoOptimoRows.map((r) => r.symbol));
  const fromAws = initialBb15Tickers
    .map((s) => s.toUpperCase())
    .filter((s) => rangoSymbols.has(s));
  if (fromAws.length > 0) return new Set(fromAws);
  return new Set(rangoOptimoRows.map((r) => r.symbol));
}

function TickerMov15Row({
  row,
  checked,
  pending,
  onToggle,
}: {
  row: RangoOptimoEntry;
  checked: boolean;
  pending: boolean;
  onToggle: (symbol: string) => void;
}) {
  const minMax = formatMinMaxLabel(row);
  return (
    <tr
      className={`border-b border-gray-100 last:border-b-0 ${
        checked ? "bg-violet-50/60" : ""
      }`}
    >
      <td className="py-2.5 px-3 font-mono font-semibold text-investep-navy">{row.symbol}</td>
      <td className="py-2.5 px-3 text-gray-700 tabular-nums">{formatRangoOptimoLabel(row)}</td>
      <td className="py-2.5 px-3 text-gray-600 text-xs tabular-nums">{minMax ?? "—"}</td>
      <td className="py-2.5 px-3 text-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={() => onToggle(row.symbol)}
          onClick={(e) => e.stopPropagation()}
          disabled={pending}
          aria-label={`Movimiento 15M ${row.symbol}`}
          className="h-4 w-4"
        />
      </td>
    </tr>
  );
}

export function TickerSettingsPanel({
  configured,
  rangoOptimoRows,
  initialBb15Tickers,
  lastImportDate,
}: Props) {
  const [selected, setSelected] = useState<Set<string>>(() =>
    buildInitialSelection(initialBb15Tickers, rangoOptimoRows)
  );
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const headerCheckboxRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSelected(buildInitialSelection(initialBb15Tickers, rangoOptimoRows));
  }, [initialBb15Tickers.join(","), rangoOptimoRows.map((r) => r.symbol).join(",")]);

  const allSelected =
    rangoOptimoRows.length > 0 && selected.size === rangoOptimoRows.length;
  const someSelected = selected.size > 0 && !allSelected;

  useEffect(() => {
    const el = headerCheckboxRef.current;
    if (el) el.indeterminate = someSelected;
  }, [someSelected]);

  const { with15m, without15m } = useMemo(() => {
    const enabled: RangoOptimoEntry[] = [];
    const rest: RangoOptimoEntry[] = [];
    for (const row of rangoOptimoRows) {
      if (selected.has(row.symbol)) enabled.push(row);
      else rest.push(row);
    }
    const bySymbol = (a: RangoOptimoEntry, b: RangoOptimoEntry) =>
      a.symbol.localeCompare(b.symbol);
    enabled.sort(bySymbol);
    rest.sort(bySymbol);
    return { with15m: enabled, without15m: rest };
  }, [rangoOptimoRows, [...selected].sort().join(",")]);

  const subtitle =
    rangoOptimoRows.length === 0
      ? "Importa el Excel arriba para cargar tickers con rango óptimo."
      : `Tickers del Excel${lastImportDate ? ` · ${lastImportDate}` : ""} · ${selected.size}/${rangoOptimoRows.length} con 15M · BB15 (9:30:30–10:00 ET)`;

  function toggle(symbol: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(symbol)) next.delete(symbol);
      else next.add(symbol);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => {
      const everySelected =
        rangoOptimoRows.length > 0 &&
        rangoOptimoRows.every((r) => prev.has(r.symbol));
      if (everySelected) return new Set();
      return new Set(rangoOptimoRows.map((r) => r.symbol));
    });
  }

  function onSave() {
    const symbols = rangoOptimoRows
      .map((r) => r.symbol)
      .filter((s) => selected.has(s));
    if (symbols.length === 0) {
      setMessage("Marca al menos un ticker para Movimiento 15M.");
      return;
    }
    setMessage(null);
    startTransition(async () => {
      const result = await setFinanceAiBolinger15Tickers(symbols);
      if (!result.success) {
        setMessage(result.error ?? "No se pudo guardar Movimiento 15M.");
        return;
      }
      const awsNote = configured ? " y AWS" : "";
      setMessage(`Movimiento 15M guardado en MySQL (mshort)${awsNote} (${symbols.length} tickers).`);
    });
  }

  return (
    <CollapsibleConfigSection
      title="Movimiento 15M"
      subtitle={subtitle}
      defaultOpen={false}
      headerExtraWhenOpenOnly
      headerExtra={
        rangoOptimoRows.length > 0 ? (
          <button
            type="button"
            onClick={onSave}
            disabled={pending || selected.size === 0}
            className="text-sm font-medium !text-white px-4 py-2 rounded-lg shadow-md disabled:opacity-50 !bg-violet-700 hover:!bg-violet-800"
          >
            {pending ? "…" : "Guardar 15M"}
          </button>
        ) : null
      }
    >
      {rangoOptimoRows.length === 0 ? (
        <p className="text-sm text-gray-500">Sin tickers cargados.</p>
      ) : (
        <>
          {!configured ? (
            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded p-3">
              Sin FinanceAI — la selección se guarda en MySQL. Configura{" "}
              <code className="text-xs">FINANCE_AI_API_URL</code> y{" "}
              <code className="text-xs">FINANCE_AI_API_KEY</code> para enviar también a AWS.
            </p>
          ) : null}

          <div className="overflow-x-auto border border-gray-100 rounded-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b bg-slate-50/80">
                  <th className="py-2 px-3 font-medium">Ticker</th>
                  <th className="py-2 px-3 font-medium">Rango óptimo</th>
                  <th className="py-2 px-3 font-medium">Mín / Máx</th>
                  <th className="py-2 px-3 font-medium text-center w-36">
                    <label className="inline-flex flex-col items-center gap-1 cursor-pointer select-auto">
                      <input
                        ref={headerCheckboxRef}
                        type="checkbox"
                        checked={allSelected}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleAll();
                        }}
                        onChange={() => undefined}
                        disabled={pending || rangoOptimoRows.length === 0}
                        aria-label="Seleccionar todos Movimiento 15M"
                        className="h-4 w-4 cursor-pointer"
                      />
                      <span>Movimiento 15M</span>
                    </label>
                  </th>
                </tr>
              </thead>
              <tbody>
                {with15m.length > 0 ? (
                  <>
                    <tr className="bg-violet-50/90 border-b border-violet-100">
                      <td
                        colSpan={4}
                        className="py-1.5 px-3 text-[11px] font-medium uppercase tracking-wide text-violet-800"
                      >
                        Movimiento 15M · {with15m.length}
                      </td>
                    </tr>
                    {with15m.map((row) => (
                      <TickerMov15Row
                        key={row.symbol}
                        row={row}
                        checked={selected.has(row.symbol)}
                        pending={pending}
                        onToggle={toggle}
                      />
                    ))}
                  </>
                ) : null}
                {without15m.length > 0 ? (
                  <>
                    <tr className="bg-slate-50 border-b border-gray-200">
                      <td
                        colSpan={4}
                        className="py-1.5 px-3 text-[11px] font-medium uppercase tracking-wide text-gray-500"
                      >
                        Sin Movimiento 15M · {without15m.length}
                      </td>
                    </tr>
                    {without15m.map((row) => (
                      <TickerMov15Row
                        key={row.symbol}
                        row={row}
                        checked={selected.has(row.symbol)}
                        pending={pending}
                        onToggle={toggle}
                      />
                    ))}
                  </>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onSave}
              disabled={pending || selected.size === 0}
              className="text-sm font-medium px-4 py-2 rounded-lg border border-violet-400 text-violet-900 bg-violet-50 hover:bg-violet-100 disabled:opacity-50"
            >
              {pending ? "…" : "Guardar Movimiento 15M"}
            </button>
          </div>
        </>
      )}

      {message ? (
        <p
          className={`text-sm rounded p-3 border ${
            message.includes("No se") ||
            message.includes("al menos") ||
            message.includes("no configurado") ||
            message.includes("Error")
              ? "text-red-800 bg-red-50 border-red-200"
              : "text-green-800 bg-green-50 border-green-200"
          }`}
        >
          {message}
        </p>
      ) : null}
    </CollapsibleConfigSection>
  );
}
