"use client";

import { useCallback, useEffect, useState } from "react";
import {
  MARKET_AI_EVALUABLE_STRATEGIES,
} from "@/lib/market-ai-process-scope";import { STRATEGY_CANONICAL_NAMES } from "@/lib/strategy-display";
import {
  getFinanceAiScheduleSettings,
  setFinanceAiEvaluateStrategyIds,
} from "@/server/actions/finance-ai-schedules";
import { CollapseToggleButton } from "@/components/CollapseChevron";

type Props = {
  configured?: boolean;
};

export function EvaluateStrategiesSettingsPanel({ configured = true }: Props) {
  const [open, setOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>(["estrategia-01"]);
  const [effective, setEffective] = useState<string[]>(["estrategia-01"]);
  const [configuredInAws, setConfiguredInAws] = useState(false);

  const load = useCallback(async () => {
    if (!configured) return;
    setLoading(true);
    setError(null);
    const result = await getFinanceAiScheduleSettings();
    setLoading(false);
    if (!result.success || !result.settings) {
      setError(result.error ?? "No se pudieron leer schedules");
      return;
    }
    const effectiveIds =
      result.settings.evaluateStrategyIdsEffective?.length
        ? result.settings.evaluateStrategyIdsEffective
        : result.settings.evaluateStrategyIds?.length
          ? result.settings.evaluateStrategyIds
          : ["estrategia-01"];
    const stored = result.settings.evaluateStrategyIds;
    setEffective(effectiveIds);
    setConfiguredInAws(Boolean(stored?.length));
    setSelected(stored?.length ? stored : effectiveIds);
  }, [configured]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = (strategyId: string) => {
    setSelected((prev) => {
      if (prev.includes(strategyId)) {
        if (prev.length === 1) return prev;
        return prev.filter((id) => id !== strategyId);
      }
      return [...prev, strategyId];
    });
    setMessage(null);
  };

  const save = async () => {
    if (!configured || selected.length === 0) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    const result = await setFinanceAiEvaluateStrategyIds(selected);
    setSaving(false);
    if (!result.success || !result.settings) {
      setError(result.error ?? "No se pudo guardar");
      return;
    }
    const effectiveIds =
      result.settings.evaluateStrategyIdsEffective ??
      result.settings.evaluateStrategyIds ??
      selected;
    setEffective(effectiveIds);
    setConfiguredInAws(true);
    setSelected(result.settings.evaluateStrategyIds ?? selected);
    setMessage(
      `Guardado · PRE, NOW y POST evaluarán ${effectiveIds.length} estrategia(s).`
    );
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-slate-100">
        <div>
          <p className="text-xs uppercase tracking-wider text-investep-gold">Market AI</p>
          <h2 className="font-semibold text-investep-navy text-sm">
            Estrategias a evaluar (PRE · NOW · POST)
          </h2>
          <p className="text-xs text-gray-600 mt-1">
            Playbooks que FinanceAI evalúa en Premarket (strategy-checks + evaluate-strategies
            → TickersToday), NOW (polling / intake manual) y Post-market (resultado vs PRE).
            Sin configuración en AWS: solo la primera estrategia publicada.
          </p>
        </div>        <CollapseToggleButton open={open} onToggle={() => setOpen((v) => !v)} />
      </div>

      {open && (
        <div className="px-4 py-3 space-y-3">
          {!configured && (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded p-2">
              FinanceAI no configurado — no se puede guardar en AWS.
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2 text-[10px]">
            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
              Efectivo hoy: {effective.join(", ") || "—"}
            </span>
            {!configuredInAws && (
              <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200">
                Default AWS: primera publicada
              </span>
            )}
          </div>

          <ul className="space-y-2">
            {MARKET_AI_EVALUABLE_STRATEGIES.map((strategyId) => {
              const checked = selected.includes(strategyId);
              const label = STRATEGY_CANONICAL_NAMES[strategyId] ?? strategyId;
              return (
                <li key={strategyId}>
                  <label className="flex items-start gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={checked}
                      disabled={!configured || loading || saving}
                      onChange={() => toggle(strategyId)}
                    />
                    <span>
                      <span className="font-medium text-investep-navy">{label}</span>
                      <span className="block text-[10px] text-gray-500">{strategyId}</span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="text-xs px-3 py-1.5 rounded bg-investep-navy text-white disabled:opacity-50"
              disabled={!configured || saving || selected.length === 0}
              onClick={() => void save()}
            >
              {saving ? "Guardando…" : "Guardar en AWS"}
            </button>
            <button
              type="button"
              className="text-xs px-3 py-1.5 rounded border border-slate-300 text-slate-700 disabled:opacity-50"
              disabled={!configured || loading}
              onClick={() => void load()}
            >
              {loading ? "Cargando…" : "Recargar"}
            </button>
          </div>

          {error && <p className="text-xs text-red-700">{error}</p>}
          {message && <p className="text-xs text-emerald-800">{message}</p>}
        </div>
      )}
    </section>
  );
}
