"use client";

import Link from "next/link";
import { TOOLS_STRATEGIES_PATH } from "@/lib/tools-paths";
import { deleteStrategy } from "@/server/actions/strategies";

export function StrategyRowActions({
  id,
  name,
  isSelected,
}: {
  id: number;
  name: string;
  isSelected: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      <Link
        href={`${TOOLS_STRATEGIES_PATH}?id=${id}`}
        className="text-xs bg-investep-navy text-white px-2 py-1 rounded"
      >
        {isSelected ? "Viendo" : "Ver / Editar"}
      </Link>
      <form
        action={deleteStrategy}
        className="inline"
        onSubmit={(e) => {
          if (!confirm(`¿Eliminar la estrategia "${name}" y todos sus datos?`)) {
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
  );
}
