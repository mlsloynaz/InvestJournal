"use client";

import { useState } from "react";
import { createStrategy } from "@/server/actions/strategies";

export function StrategyCreateForm({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="bg-investep-gold text-investep-navy text-sm font-semibold px-4 py-2 rounded"
      >
        + Nueva estrategia
      </button>
    );
  }

  return (
    <section className="bg-white border-2 border-investep-gold/40 rounded-lg p-4 space-y-3">
      <div className="flex justify-between items-center">
        <h2 className="text-sm font-semibold text-investep-navy">Crear estrategia</h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="!bg-transparent !text-gray-500 text-xs underline !p-0"
        >
          Cancelar
        </button>
      </div>
      <form action={createStrategy} className="flex flex-wrap gap-3 items-end">
        <label className="text-sm flex-1 min-w-[200px]">
          Nombre *
          <input name="name" required className="w-full mt-1" placeholder="Ej. Breakout con volumen" />
        </label>
        <button type="submit">Crear</button>
      </form>
    </section>
  );
}
