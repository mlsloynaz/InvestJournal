"use client";

import { useRef, useState, useTransition } from "react";
import { importRangoOptimoFromXlsx } from "@/server/actions/rango-optimo";
import { CollapsibleConfigSection } from "@/components/config/CollapsibleConfigSection";

type Props = {
  lastImportDate: string | null;
  rowCount: number;
};

export function RangoOptimoImportPanel({ lastImportDate, rowCount }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [localDate, setLocalDate] = useState(lastImportDate);
  const [localCount, setLocalCount] = useState(rowCount);

  const subtitle = `Última fecha: ${localDate ?? "—"} · ${localCount} tickers en MySQL`;

  function onSubmit(formData: FormData) {
    setMessage(null);
    startTransition(async () => {
      const result = await importRangoOptimoFromXlsx(formData);
      if (!result.success) {
        setMessage(result.error ?? "No se pudo importar.");
        return;
      }
      if (result.analysisDate) setLocalDate(result.analysisDate);
      if (result.imported != null) setLocalCount(result.imported);
      setMessage(
        `Rangos óptimos: ${result.imported} tickers · fecha ${result.analysisDate ?? "—"}` +
          (result.tickersAdded
            ? ` · ${result.tickersAdded} nuevo(s) en tabla tickers`
            : " · tickers ya sincronizados")
      );
      if (inputRef.current) inputRef.current.value = "";
    });
  }

  return (
    <CollapsibleConfigSection
      title="Rangos óptimos · Importar Excel"
      subtitle={subtitle}
      defaultOpen={false}
    >
      <p className="text-xs text-gray-600">
        Sube un archivo como{" "}
        <code className="text-[11px]">rango_precios_opciones_2026-05-20.xlsx</code>. Actualiza{" "}
        <strong>rango_optimo</strong> y crea filas faltantes en <strong>tickers</strong>. Columnas{" "}
        <strong>TICKER</strong>, <strong>NOMBRE</strong>, <strong>RANGO ÓPTIMO</strong> y{" "}
        <strong>MÍNIMO Y MÁXIMO</strong>. Los nombres se copian a <strong>rango_optimo</strong> y{" "}
        <strong>tickers</strong>.
      </p>

      <div className="text-sm text-gray-700 grid sm:grid-cols-2 gap-2">
        <p>
          <span className="text-gray-500">Última fecha importada:</span>{" "}
          <strong className="text-investep-navy">{localDate ?? "—"}</strong>
        </p>
        <p>
          <span className="text-gray-500">Tickers en MySQL:</span>{" "}
          <strong className="text-investep-navy">{localCount}</strong>
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(new FormData(e.currentTarget));
        }}
        className="flex flex-wrap items-end gap-3"
      >
        <label className="text-sm flex-1 min-w-[220px]">
          Archivo Excel
          <input
            ref={inputRef}
            type="file"
            name="file"
            accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            required
            disabled={pending}
            className="mt-1 block w-full text-sm"
          />
        </label>
        <button type="submit" disabled={pending} className="shrink-0">
          {pending ? "Importando…" : "Importar a MySQL"}
        </button>
      </form>

      {message ? (
        <p
          className={`text-sm rounded p-3 border ${
            message.includes("No se") ||
            message.includes("Selecciona") ||
            message.includes("Solo archivos") ||
            message.includes("debe incluir")
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
