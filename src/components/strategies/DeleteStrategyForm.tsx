"use client";

import { deleteStrategy } from "@/server/actions/strategies";

export function DeleteStrategyForm({
  strategyId,
  strategyName,
}: {
  strategyId: number;
  strategyName: string;
}) {
  return (
    <form
      action={deleteStrategy}
      onSubmit={(e) => {
        if (!confirm(`¿Eliminar la estrategia "${strategyName}" y todos sus datos?`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={strategyId} />
      <button type="submit" className="!bg-red-800 text-sm">
        Eliminar estrategia
      </button>
    </form>
  );
}
