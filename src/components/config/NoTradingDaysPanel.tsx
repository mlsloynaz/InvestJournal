"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { CollapsibleConfigSection } from "@/components/config/CollapsibleConfigSection";
import {
  getDefaultUsEquityHolidays,
  mergeDefaultUsEquityHolidays,
  publishNoTradingDaysToAws,
  saveNoTradingDays,
} from "@/server/actions/no-trading-days";
import { parseTradeDateIso, sortNoTradingDays, type NoTradingDayRow } from "@/lib/no-trading-days";

type Props = {
  initialDays: NoTradingDayRow[];
  financeAiConfigured?: boolean;
};

const BTN =
  "text-xs px-2.5 py-1 rounded font-medium border disabled:opacity-50";
const BTN_PRIMARY = `${BTN} bg-investep-gold text-investep-navy border-investep-gold/80`;
const BTN_SECONDARY = `${BTN} border-gray-300 bg-white text-investep-navy hover:bg-gray-50`;

export function NoTradingDaysPanel({
  initialDays,
  financeAiConfigured = false,
}: Props) {
  const [rows, setRows] = useState<NoTradingDayRow[]>(() => sortNoTradingDays(initialDays));
  const [savedRows, setSavedRows] = useState<NoTradingDayRow[]>(() =>
    sortNoTradingDays(initialDays)
  );
  const [newDate, setNewDate] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const sorted = sortNoTradingDays(initialDays);
    setRows(sorted);
    setSavedRows(sorted);
  }, [initialDays]);

  const dirty = useMemo(
    () => JSON.stringify(rows) !== JSON.stringify(savedRows),
    [rows, savedRows]
  );

  const addRow = useCallback(() => {
    const date = parseTradeDateIso(newDate);
    if (!date) {
      setError("Usa formato YYYY-MM-DD.");
      return;
    }
    if (rows.some((r) => r.date === date)) {
      setError(`${date} ya esta en la lista.`);
      return;
    }
    setError(null);
    setMessage(null);
    setRows((prev) =>
      sortNoTradingDays([
        ...prev,
        { date, label: newLabel.trim() || null, source: "manual" },
      ])
    );
    setNewDate("");
    setNewLabel("");
  }, [newDate, newLabel, rows]);

  const removeRow = useCallback((date: string) => {
    setRows((prev) => prev.filter((r) => r.date !== date));
    setMessage(null);
  }, []);

  const loadDefaults = useCallback(() => {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const defaults = await getDefaultUsEquityHolidays();
      setRows((prev) =>
        sortNoTradingDays([
          ...prev,
          ...defaults.filter((d) => !prev.some((p) => p.date === d.date)),
        ])
      );
      setMessage("Festivos NYSE 2025-2026 agregados (guarda para persistir).");
    });
  }, []);

  const save = useCallback(() => {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await saveNoTradingDays(rows);
      if (!result.success) {
        setError(result.error ?? "No se pudo guardar");
        return;
      }
      const saved = result.rows ?? rows;
      setRows(saved);
      setSavedRows(saved);
      if (result.awsError) {
        setError(`MySQL OK � AWS: ${result.awsError}`);
        setMessage(`Guardado en MySQL (${saved.length} dias).`);
        return;
      }
      const awsNote =
        financeAiConfigured && result.awsSynced
          ? " � publicado en AWS (PUT /config/schedules)"
          : financeAiConfigured
            ? ""
            : " � AWS omitido (FinanceAI no configurado)";
      setMessage(`Guardado (${saved.length} dias)${awsNote}.`);
    });
  }, [rows, financeAiConfigured]);

  const mergeAndSaveDefaults = useCallback(() => {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await mergeDefaultUsEquityHolidays(rows);
      if (!result.success) {
        setError(result.error ?? "No se pudo guardar");
        return;
      }
      const saved = result.rows ?? [];
      setRows(saved);
      setSavedRows(saved);
      if (result.awsError) {
        setError(`MySQL OK � AWS: ${result.awsError}`);
      }
      setMessage(
        `Guardado (${saved.length} dias incl. festivos NYSE)${
          result.awsSynced ? " � AWS actualizado" : ""
        }.`
      );
    });
  }, [rows]);

  const syncAwsOnly = useCallback(() => {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await publishNoTradingDaysToAws();
      if (!result.success) {
        setError(result.error ?? "No se pudo publicar en AWS");
        return;
      }
      setMessage(
        `Lista publicada en AWS (${result.count ?? savedRows.length} dias) � PUT /config/schedules`
      );
    });
  }, [savedRows.length]);

  return (
    <CollapsibleConfigSection
      title="Exclude trading days"
      subtitle="Dias sin sesion NYSE � MySQL no_trading_days + PUT /config/schedules (noTradingDays) en AWS."
      defaultOpen={false}
      headerExtra={
        <div className="flex flex-wrap gap-1.5">
          {financeAiConfigured && (
            <button
              type="button"
              className={BTN_SECONDARY}
              disabled={pending || savedRows.length === 0}
              onClick={() => syncAwsOnly()}
            >
              {pending ? "..." : "Publicar AWS"}
            </button>
          )}
          <button
            type="button"
            className={BTN_PRIMARY}
            disabled={pending || !dirty}
            onClick={() => save()}
          >
            {pending ? "..." : "Guardar"}
          </button>
        </div>
      }
      headerExtraWhenOpenOnly
    >
      <div className="space-y-3">
        {!financeAiConfigured && (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-2.5 py-2">
            FinanceAI no configurado � solo se guardara en MySQL hasta que configures .env.
          </p>
        )}

        <p className="text-xs text-gray-600">
          Agrega fechas ET (YYYY-MM-DD). Guardar escribe MySQL y, si FinanceAI esta configurado,
          envia la lista completa a AWS via{" "}
          <code className="text-[10px] bg-gray-100 px-1 rounded">noTradingDays</code>.
        </p>

        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs text-gray-600">
            Fecha
            <input
              type="date"
              value={newDate}
              disabled={pending}
              onChange={(e) => setNewDate(e.target.value)}
              className="block mt-0.5 border border-gray-300 rounded px-2 py-1 text-sm"
            />
          </label>
          <label className="text-xs text-gray-600 min-w-[10rem]">
            Etiqueta (opcional)
            <input
              type="text"
              value={newLabel}
              disabled={pending}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Ej. Thanksgiving"
              className="block mt-0.5 w-full border border-gray-300 rounded px-2 py-1 text-sm"
            />
          </label>
          <button type="button" className={BTN_SECONDARY} disabled={pending} onClick={addRow}>
            Agregar
          </button>
          <button type="button" className={BTN_SECONDARY} disabled={pending} onClick={loadDefaults}>
            Cargar festivos NYSE
          </button>
          <button
            type="button"
            className={BTN_SECONDARY}
            disabled={pending}
            onClick={mergeAndSaveDefaults}
          >
            Fusionar festivos y guardar
          </button>
        </div>

        {dirty && (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1">
            Cambios sin guardar.
          </p>
        )}
        {message && <p className="text-xs text-emerald-800">{message}</p>}
        {error && <p className="text-xs text-red-700">{error}</p>}

        {rows.length === 0 ? (
          <p className="text-xs text-gray-500">Sin dias excluidos. Agrega fechas o carga festivos.</p>
        ) : (
          <div className="border border-gray-200 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 text-left text-gray-600 sticky top-0">
                <tr>
                  <th className="px-3 py-2 font-medium">Fecha (ET)</th>
                  <th className="px-3 py-2 font-medium">Etiqueta</th>
                  <th className="px-3 py-2 font-medium w-20" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((row) => (
                  <tr key={row.date} className="bg-white">
                    <td className="px-3 py-1.5 font-mono text-investep-navy">{row.date}</td>
                    <td className="px-3 py-1.5 text-gray-600">{row.label ?? "-"}</td>
                    <td className="px-3 py-1.5 text-right">
                      <button
                        type="button"
                        className="text-red-700 hover:underline disabled:opacity-50"
                        disabled={pending}
                        onClick={() => removeRow(row.date)}
                      >
                        Quitar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-[10px] text-gray-400">
          MySQL: <code className="bg-gray-100 px-1 rounded">no_trading_days</code>
          {" � "}
          AWS: <code className="bg-gray-100 px-1 rounded">PUT /config/schedules</code>
        </p>
      </div>
    </CollapsibleConfigSection>
  );
}
