"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import type { RangoOptimoEntry } from "@/server/actions/rango-optimo";
import { setFinanceAiBuySellTickers } from "@/server/actions/finance-ai-schedules";
import { CollapsibleConfigSection } from "@/components/config/CollapsibleConfigSection";

type Props = {
  configured: boolean;
  buySellEnabled: boolean;
  initialBuySellTickers: string[];
  rangoOptimoRows: RangoOptimoEntry[];
};

function normalizeSymbol(raw: string): string | null {
  const sym = raw.trim().toUpperCase().replace(/[^A-Z0-9.]/g, "");
  if (!sym || sym.length > 8) return null;
  return sym;
}

export function BuySellTickersPanel({
  configured,
  buySellEnabled,
  initialBuySellTickers,
  rangoOptimoRows,
}: Props) {
  const [tickers, setTickers] = useState<string[]>(() =>
    initialBuySellTickers.map((s) => s.toUpperCase())
  );
  const [input, setInput] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setTickers(initialBuySellTickers.map((s) => s.toUpperCase()));
  }, [initialBuySellTickers.join(",")]);

  const sortedTickers = useMemo(
    () => [...tickers].sort((a, b) => a.localeCompare(b)),
    [tickers]
  );

  const datalistId = "buy-sell-ticker-suggestions";

  function onAdd() {
    const sym = normalizeSymbol(input);
    if (!sym) {
      setMessage("Indica un ticker válido (ej. SPY, AAPL).");
      return;
    }
    if (tickers.includes(sym)) {
      setMessage(`${sym} ya está en la lista.`);
      setInput("");
      return;
    }
    setTickers((prev) => [...prev, sym]);
    setInput("");
    setMessage(null);
  }

  function onRemove(symbol: string) {
    setTickers((prev) => prev.filter((s) => s !== symbol));
    setMessage(null);
  }

  function onInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      onAdd();
    }
  }

  function onSave() {
    setMessage(null);
    startTransition(async () => {
      const result = await setFinanceAiBuySellTickers(tickers);
      if (!result.success) {
        setMessage(result.error ?? "No se pudo guardar la lista Buy/Sell.");
        return;
      }
      const saved = (result.settings?.buySellTickers ?? tickers).map((s) => s.toUpperCase());
      setTickers(saved);
      setMessage(
        configured
          ? `Lista Buy/Sell guardada en AWS (${saved.length} ticker${saved.length === 1 ? "" : "s"}).`
          : "FinanceAI no configurado — no se pudo guardar en AWS."
      );
    });
  }

  const subtitle =
    tickers.length === 0
      ? "Sin tickers — agrega símbolos para habilitar Comprar/Vender en Movimientos -15M."
      : `${tickers.length} ticker${tickers.length === 1 ? "" : "s"} · Market → Movimientos 15m`;

  return (
    <CollapsibleConfigSection
      title="Buy / Sell"
      subtitle={subtitle}
      defaultOpen={false}
      headerExtraWhenOpenOnly
      headerExtra={
        <button
          type="button"
          onClick={onSave}
          disabled={pending || !configured}
          className="text-sm font-medium !text-white px-4 py-2 rounded-lg shadow-md disabled:opacity-50 !bg-emerald-700 hover:!bg-emerald-800"
        >
          {pending ? "…" : "Guardar lista"}
        </button>
      }
    >
      <p className="text-xs text-gray-600">
        Agrega tickers uno a uno. Solo los de esta lista muestran botones Comprar/Vender cuando el
        toggle global está activo en{" "}
        <Link href="/config/aws" className="text-sky-800 underline underline-offset-2">
          Config → AWS
        </Link>
        .
      </p>

      {!configured ? (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded p-3">
          Configura <code className="text-xs">FINANCE_AI_API_URL</code> y{" "}
          <code className="text-xs">FINANCE_AI_API_KEY</code> para guardar la lista en AWS.
        </p>
      ) : (
        <p className="text-sm">
          Toggle global:{" "}
          <span
            className={
              buySellEnabled ? "text-green-700 font-medium" : "text-red-700 font-medium"
            }
          >
            {buySellEnabled ? "Activado" : "Desactivado"}
          </span>
          {!buySellEnabled ? (
            <span className="text-gray-500 text-xs ml-2">
              — actívalo en Config → AWS para usar la lista.
            </span>
          ) : null}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value.toUpperCase())}
          onKeyDown={onInputKeyDown}
          list={rangoOptimoRows.length > 0 ? datalistId : undefined}
          placeholder="Ticker (ej. SPY)"
          disabled={pending}
          className="w-36 text-sm font-mono border border-gray-300 rounded-lg px-3 py-2 uppercase"
          aria-label="Ticker para Buy/Sell"
        />
        {rangoOptimoRows.length > 0 ? (
          <datalist id={datalistId}>
            {rangoOptimoRows.map((row) => (
              <option key={row.symbol} value={row.symbol} />
            ))}
          </datalist>
        ) : null}
        <button
          type="button"
          onClick={onAdd}
          disabled={pending || !input.trim()}
          className="text-sm px-3 py-2 rounded-lg border border-emerald-500 text-emerald-900 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50"
        >
          Agregar
        </button>
      </div>

      <div className="border border-gray-200 rounded-lg p-3 min-h-[4.5rem] bg-slate-50/50">
        <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500 mb-2">
          Tickers habilitados · {tickers.length}
        </p>
        {sortedTickers.length === 0 ? (
          <p className="text-sm text-gray-500">Lista vacía — ningún ticker tendrá botones Buy/Sell.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {sortedTickers.map((symbol) => (
              <li key={symbol}>
                <span className="inline-flex items-center gap-1 text-xs font-mono bg-white border border-emerald-200 rounded-full pl-2.5 pr-1 py-0.5">
                  {symbol}
                  <button
                    type="button"
                    onClick={() => onRemove(symbol)}
                    disabled={pending}
                    aria-label={`Quitar ${symbol}`}
                    className="rounded-full w-5 h-5 text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    ×
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        type="button"
        onClick={onSave}
        disabled={pending || !configured}
        className="text-sm font-medium px-4 py-2 rounded-lg border border-emerald-500 text-emerald-900 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50"
      >
        {pending ? "…" : "Guardar lista Buy/Sell"}
      </button>

      {message ? (
        <p
          className={`text-sm rounded p-3 border ${
            message.includes("No se") ||
            message.includes("válido") ||
            message.includes("ya está") ||
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
