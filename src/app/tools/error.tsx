"use client";

import Link from "next/link";

export default function ToolsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-2xl font-bold text-investep-navy">Error en Tools</h1>
      <p className="text-sm text-gray-700">{error.message}</p>
      <div className="flex gap-3 text-sm">
        <button type="button" onClick={reset} className="underline">
          Reintentar
        </button>
        <Link href="/" className="text-investep-navy underline">
          Inicio
        </Link>
      </div>
    </div>
  );
}
