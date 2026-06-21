"use client";

import { useState } from "react";
import { deleteTicker, updateTicker } from "@/server/actions/tickers";

type Props = {
  id: number;
  symbol: string;
  name: string | null;
  notes: string | null;
  children?: React.ReactNode;
};

export function TickerRowActions({ id, symbol, name, notes, children }: Props) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <li className="px-4 py-3 bg-amber-50/50 border-b last:border-b-0">
        <form action={updateTicker} className="space-y-3">
          <input type="hidden" name="id" value={id} />
          <div className="flex flex-wrap gap-3 items-end">
            <label className="text-sm">
              Símbolo *
              <input
                name="symbol"
                required
                defaultValue={symbol}
                className="block mt-1 uppercase"
              />
            </label>
            <label className="text-sm flex-1 min-w-[140px]">
              Nombre
              <input name="name" defaultValue={name ?? ""} className="block mt-1 w-full" />
            </label>
          </div>
          <label className="text-sm block">
            Notas
            <textarea
              name="notes"
              rows={2}
              defaultValue={notes ?? ""}
              className="block mt-1 w-full text-sm"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="submit">Guardar</button>
            <button
              type="button"
              className="!bg-transparent !text-investep-navy underline text-sm !p-0"
              onClick={() => setEditing(false)}
            >
              Cancelar
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="px-4 py-3 flex flex-wrap gap-3 items-center justify-between border-b last:border-b-0">
      <div className="min-w-0">
        <span className="font-semibold text-investep-navy">{symbol}</span>
        {name && <span className="text-gray-500 text-sm ml-2">{name}</span>}
        {notes && (
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2" title={notes}>
            {notes}
          </p>
        )}
      </div>
      <div className="flex flex-wrap gap-2 items-center shrink-0">
        {children}
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-xs bg-investep-navy text-white px-2 py-1 rounded"
        >
          Editar
        </button>
        <form
          action={deleteTicker}
          className="inline"
          onSubmit={(e) => {
            const label = name ? `${symbol} (${name})` : symbol;
            if (
              !confirm(
                `¿Eliminar el ticker "${label}" y sus semanas, trades y análisis asociados?`
              )
            ) {
              e.preventDefault();
            }
          }}
        >
          <input type="hidden" name="id" value={id} />
          <button type="submit" className="!bg-red-700 !px-2 !py-1 text-xs">
            Eliminar
          </button>
        </form>
      </div>
    </li>
  );
}
