"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatSymbol } from "@/lib/utils";

export type TickerSearchOption = {
  symbol: string;
  name: string | null;
};

type Props = {
  tickers: TickerSearchOption[];
};

export function TickerSearch({ tickers }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const normalizedQuery = query.trim().toUpperCase();

  const matches = useMemo(() => {
    if (!normalizedQuery) return tickers.slice(0, 8);

    return tickers
      .filter((t) => {
        const symbolMatch = t.symbol.includes(normalizedQuery);
        const nameMatch = t.name?.toUpperCase().includes(normalizedQuery);
        return symbolMatch || nameMatch;
      })
      .slice(0, 8);
  }, [normalizedQuery, tickers]);

  function goToTicker(symbol: string) {
    router.push(`/tickers/${formatSymbol(symbol)}`);
    setQuery("");
    setOpen(false);
    inputRef.current?.blur();
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (matches.length === 0) return;

    const exact = tickers.find((t) => t.symbol === normalizedQuery);
    goToTicker(exact?.symbol ?? matches[0].symbol);
  }

  return (
    <form onSubmit={handleSubmit} className="relative w-full max-w-md">
      <label className="sr-only" htmlFor="dashboard-ticker-search">
        Buscar ticker
      </label>
      <input
        ref={inputRef}
        id="dashboard-ticker-search"
        type="search"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 150);
        }}
        placeholder="Buscar ticker…"
        autoComplete="off"
        className="w-full"
      />

      {open && matches.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full bg-white border border-investep-navy/20 rounded-md shadow-lg overflow-hidden">
          {matches.map((ticker) => (
            <li key={ticker.symbol}>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => goToTicker(ticker.symbol)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-investep-cream/60 flex items-baseline gap-2 !bg-transparent !rounded-none !shadow-none !font-normal"
              >
                <span className="font-semibold text-investep-navy">{ticker.symbol}</span>
                {ticker.name && (
                  <span className="text-gray-500 truncate">{ticker.name}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && normalizedQuery && matches.length === 0 && (
        <p className="absolute z-20 mt-1 w-full bg-white border border-investep-navy/20 rounded-md shadow-lg px-3 py-2 text-sm text-gray-500">
          No se encontró &quot;{query.trim()}&quot;
        </p>
      )}
    </form>
  );
}
