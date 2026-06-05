"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-2xl font-bold text-investep-navy">Algo salió mal</h1>
      <p className="text-sm text-gray-700">{error.message}</p>
      <div className="flex gap-3 text-sm">
        <button type="button" onClick={reset} className="underline">
          Reintentar
        </button>
        <Link href="/" className="text-investep-navy underline">
          Ir al inicio
        </Link>
      </div>
    </div>
  );
}
