"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { RangoOptimoEntry } from "@/server/actions/rango-optimo";
import { saveMlongTickers } from "@/server/actions/tickers";
import { formatMinMaxLabel, formatRangoOptimoLabel } from "@/lib/rango-optimo-display";
import { CollapsibleConfigSection } from "@/components/config/CollapsibleConfigSection";

type Props = {
  rangoOptimoRows: RangoOptimoEntry[];
  initialMlongTickers: string[];
  lastImportDate?: string | null;
  defaultOpen?: boolean;
  /** When true, omit collapsible section chrome (e.g. inside a modal). */
  embedded?: boolean;
  onSaved?: (symbols: string[]) => void;
};

function buildInitialSelection(
  initialMlongTickers: string[],
  rangoOptimoRows: RangoOptimoEntry[]
): Set<string> {
  const rangoSymbols = new Set(rangoOptimoRows.map((r) => r.symbol));
  const fromDb = initialMlongTickers
    .map((s) => s.toUpperCase())
    .filter((s) => rangoSymbols.has(s));
  if (fromDb.length > 0) return new Set(fromDb);
  return new Set<string>();
}

function TickerMlongRow({
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
        checked ? "bg-emerald-50/60" : ""
      }`}
    >
      <td className="py-2.5 px-3 font-mono font-semibold text-investep-navy">{row.symbol}</td>
      <td className="py-2.5 px-3 text-gray-700 tabular-nums">{formatRangoOptimoLabel(row)}</td>
      <td className="py-2.5 px-3 text-gray-600 text-xs tabular-nums">{minMax ?? "-"}</td>
      <td className="py-2.5 px-3 text-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={() => onToggle(row.symbol)}
          onClick={(e) => e.stopPropagation()}
          disabled={pending}
          aria-label={`Movimientos Long ${row.symbol}`}
          className="h-4 w-4"
        />
      </td>
    </tr>
  );
}

export function TickerMlongSettingsPanel({
  rangoOptimoRows,
  initialMlongTickers,
  lastImportDate,
  defaultOpen = false,
  embedded = false,
  onSaved,
}: Props) {
  const [selected, setSelected] = useState<Set<string>>(() =>
    buildInitialSelection(initialMlongTickers, rangoOptimoRows)
  );
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const headerCheckboxRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSelected(buildInitialSelection(initialMlongTickers, rangoOptimoRows));
  }, [initialMlongTickers.join(","), rangoOptimoRows.map((r) => r.symbol).join(",")]);

  const allSelected =
    rangoOptimoRows.length > 0 && selected.size === rangoOptimoRows.length;
  const someSelected = selected.size > 0 && !allSelected;

  useEffect(() => {
    const el = headerCheckboxRef.current;
    if (el) el.indeterminate = someSelected;
  }, [someSelected]);

  const { withMlong, withoutMlong } = useMemo(() => {
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
    return { withMlong: enabled, withoutMlong: rest };
  }, [rangoOptimoRows, [...selected].sort().join(",")]);

  const subtitle =
    rangoOptimoRows.length === 0
      ? "Importa el Excel arriba para cargar tickers con rango optimo."
      : `Tickers del Excel${lastImportDate ? ` | ${lastImportDate}` : ""} | ${selected.size}/${rangoOptimoRows.length} Movimientos Long | Market Result Now`;

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
    setMessage(null);
    startTransition(async () => {
      const result = await saveMlongTickers(symbols);
      if (!result.success) {
        setMessage(result.error ?? "No se pudo guardar Movimientos Long.");
        return;
      }
      setMessage(
        symbols.length > 0
          ? `Movimientos Long guardado en MySQL (${symbols.length} tickers).`
          : "Movimientos Long guardado - ningun ticker marcado."
      );
      onSaved?.(symbols);
    });
  }

  const content = (
    <>
      {rangoOptimoRows.length === 0 ? (
        <p className="text-sm text-gray-500">Sin tickers cargados.</p>
      ) : (
        <>
          <p className="text-sm text-gray-600 mb-3">
            Tickers marcados aqui (<code className="text-xs bg-gray-100 px-1">mlong</code> en
            MySQL) son los que se envian en el array <strong>symbols</strong> al evaluar en{" "}
            <strong>Market / Result Now</strong>. No se sincronizan a Dynamo.
          </p>

          <div className="overflow-x-auto border border-gray-100 rounded-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b bg-slate-50/80">
                  <th className="py-2 px-3 font-medium">Ticker</th>
                  <th className="py-2 px-3 font-medium">Rango optimo</th>
                  <th className="py-2 px-3 font-medium">Min / Max</th>
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
                        aria-label="Seleccionar todos Movimientos Long"
                        className="h-4 w-4 cursor-pointer"
                      />
                      <span>M Long</span>
                    </label>
                  </th>
                </tr>
              </thead>
              <tbody>
                {withMlong.length > 0 ? (
                  <>
                    <tr className="bg-emerald-50/90 border-b border-emerald-100">
                      <td
                        colSpan={4}
                        className="py-1.5 px-3 text-[11px] font-medium uppercase tracking-wide text-emerald-800"
                      >
                        Movimientos Long | {withMlong.length}
                      </td>
                    </tr>
                    {withMlong.map((row) => (
                      <TickerMlongRow
                        key={row.symbol}
                        row={row}
                        checked={selected.has(row.symbol)}
                        pending={pending}
                        onToggle={toggle}
                      />
                    ))}
                  </>
                ) : null}
                {withoutMlong.length > 0 ? (
                  <>
                    <tr className="bg-slate-50 border-b border-gray-200">
                      <td
                        colSpan={4}
                        className="py-1.5 px-3 text-[11px] font-medium uppercase tracking-wide text-gray-500"
                      >
                        Sin Movimientos Long | {withoutMlong.length}
                      </td>
                    </tr>
                    {withoutMlong.map((row) => (
                      <TickerMlongRow
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

          <div className="flex flex-wrap items-center gap-3 mt-3">
            <button
              type="button"
              onClick={onSave}
              disabled={pending}
              className="text-sm font-medium px-4 py-2 rounded-lg border border-emerald-500 text-emerald-900 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50"
            >
              {pending ? "..." : "Guardar Movimientos Long"}
            </button>
          </div>
        </>
      )}

      {message ? (
        <p
          className={`text-sm rounded p-3 border mt-3 ${
            message.includes("No se") || message.includes("Error")
              ? "text-red-800 bg-red-50 border-red-200"
              : "text-green-800 bg-green-50 border-green-200"
          }`}
        >
          {message}
        </p>
      ) : null}
    </>
  );

  if (embedded) {
    return (
      <div className="space-y-3">
        {subtitle ? <p className="text-xs text-gray-600">{subtitle}</p> : null}
        {content}
      </div>
    );
  }

  return (
    <CollapsibleConfigSection
      title="Movimientos Long"
      subtitle={subtitle}
      defaultOpen={defaultOpen}
      headerExtraWhenOpenOnly
      headerExtra={
        rangoOptimoRows.length > 0 ? (
          <button
            type="button"
            onClick={onSave}
            disabled={pending}
            className="text-sm font-medium !text-white px-4 py-2 rounded-lg shadow-md disabled:opacity-50 !bg-emerald-700 hover:!bg-emerald-800"
          >
            {pending ? "..." : "Guardar Long"}
          </button>
        ) : null
      }
    >
      {content}
    </CollapsibleConfigSection>
  );
}
