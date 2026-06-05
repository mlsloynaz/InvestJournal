"use client";

import { useState, useTransition } from "react";
import { getAiExportMarkdown } from "@/server/actions/export";

type Props = {
  symbol: string;
};

export function ExportForAi({ symbol }: Props) {
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function loadExport() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await getAiExportMarkdown(symbol, 14);
        setMarkdown(result.markdown);
      } catch {
        setError("No se pudo generar el export. ¿Está MySQL en ejecución?");
      }
    });
  }

  async function copyToClipboard() {
    if (!markdown) return;
    await navigator.clipboard.writeText(markdown);
  }

  return (
    <div className="bg-investep-navy/5 border border-investep-navy/20 rounded p-4 space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        <h2 className="text-sm font-semibold text-investep-navy flex-1">
          Exportar contexto para IA
        </h2>
        <button
          type="button"
          onClick={loadExport}
          disabled={pending}
          className="!bg-investep-gold !text-investep-navy"
        >
          {pending ? "Generando…" : "Generar Markdown"}
        </button>
        {markdown && (
          <button type="button" onClick={copyToClipboard} className="!bg-investep-navy">
            Copiar al portapapeles
          </button>
        )}
      </div>
      <p className="text-xs text-gray-600">
        Incluye análisis recientes, checklist y métricas de la semana actual. Pégalo en ChatGPT /
        Cursor junto con tus gráficos.
      </p>
      {error && <p className="text-sm text-red-700">{error}</p>}
      {markdown && (
        <textarea
          readOnly
          value={markdown}
          rows={16}
          className="w-full font-mono text-xs bg-white"
        />
      )}
    </div>
  );
}
