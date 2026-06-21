"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import type { NowPollIntervalSelection } from "@/lib/now-polling-session";
import {
  loadNowPollIntervalRows,
  saveNowPollIntervals,
  type NowPollIntervalRow,
} from "@/server/actions/finance-ai-now-schedules";
import { NowPollIntervalTable } from "@/components/config/NowPollIntervalEditor";
import { CollapsibleConfigSection } from "@/components/config/CollapsibleConfigSection";

type Props = {
  configured: boolean;
};

function rowsToDraft(rows: NowPollIntervalRow[]): Record<string, NowPollIntervalSelection> {
  const draft: Record<string, NowPollIntervalSelection> = {};
  for (const row of rows) {
    draft[row.symbol] = row.pollInterval;
  }
  return draft;
}

export function NowPollIntervalsConfigPanel({ configured }: Props) {
  const [rows, setRows] = useState<NowPollIntervalRow[]>([]);
  const [draft, setDraft] = useState<Record<string, NowPollIntervalSelection>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();

  const load = useCallback(async () => {
    setLoading(true);
    const result = await loadNowPollIntervalRows();
    setLoading(false);
    if (!result.success || !result.rows) {
      setMessage(result.error ?? "No se pudo cargar tickers");
      return;
    }
    setRows(result.rows);
    setDraft(rowsToDraft(result.rows));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const dirty = useMemo(() => {
    return rows.some((row) => (draft[row.symbol] ?? row.pollInterval) !== row.pollInterval);
  }, [rows, draft]);

  const subtitle = loading
    ? "Cargando favoritos…"
    : rows.length === 0
      ? "Sin favoritos — marca ★ en Tickers"
      : `${rows.length} favorito(s) · intervalos 1 / 5 / 10 / 30 / 1 h`;

  function onDraftChange(symbol: string, interval: NowPollIntervalSelection) {
    setDraft((prev) => ({ ...prev, [symbol]: interval }));
    setMessage(null);
  }

  function onSave() {
    startTransition(async () => {
      setMessage(null);
      const result = await saveNowPollIntervals(draft);
      if (!result.success) {
        setMessage(result.error ?? "No se pudo guardar");
        return;
      }
      setMessage(`Intervalos guardados en MySQL · ${result.saved ?? 0} ticker(s)`);
      await load();
    });
  }

  if (!configured) {
    return (
      <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded p-3">
        Configura FinanceAI para sincronizar schedules AWS desde Market.
      </p>
    );
  }

  return (
    <CollapsibleConfigSection
      title="Schedule for NOW · ★ favoritos"
      subtitle={subtitle}
      headerExtra={
        <button
          type="button"
          onClick={onSave}
          disabled={pending || loading || !dirty}
          className="shrink-0 text-sm font-medium !text-white px-4 py-2 rounded-lg shadow-md disabled:opacity-50 !bg-investep-navy hover:opacity-90"
        >
          {pending ? "…" : "Guardar intervalos"}
        </button>
      }
    >
      <p className="text-xs text-gray-600">
        Intervalo 1 / 5 / 10 / 30 / 1 h por ticker · guarda en MySQL. Activa checks en AWS con{" "}
        <strong>Start Automatic Checks</strong> en Market → Result Now.
      </p>

      {loading ? (
        <p className="text-sm text-gray-500">Cargando…</p>
      ) : (
        <NowPollIntervalTable rows={rows} draft={draft} disabled={pending} onDraftChange={onDraftChange} />
      )}

      {message ? (
        <p
          className={`text-sm rounded p-3 border ${
            message.includes("No se") || message.includes("Error")
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
