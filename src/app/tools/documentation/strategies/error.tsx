"use client";

import Link from "next/link";
import { TOOLS_STRATEGIES_PATH } from "@/lib/tools-paths";

export default function StrategiesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="space-y-4 max-w-lg">
      <h1 className="text-2xl font-bold text-investep-navy">Strategies</h1>
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm space-y-3">
        <p className="font-medium text-red-800">Error al cargar la página</p>
        <p className="text-red-700 text-xs font-mono break-all">{error.message}</p>
        <p className="text-gray-800">Prueba:</p>
        <ol className="list-decimal list-inside text-gray-800 space-y-1">
          <li>
            <code className="bg-white px-1">npm run setup</code>
          </li>
          <li>
            Reinicia <code className="bg-white px-1">npm run dev</code>
          </li>
        </ol>
        <div className="flex gap-3">
          <button type="button" onClick={reset} className="text-sm">
            Reintentar
          </button>
          <Link href={TOOLS_STRATEGIES_PATH} className="text-sm text-investep-navy underline">
            Ir a Strategies
          </Link>
        </div>
      </div>
    </div>
  );
}
