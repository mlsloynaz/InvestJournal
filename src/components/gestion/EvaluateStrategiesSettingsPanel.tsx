"use client";



import { useCallback, useEffect, useState } from "react";

import { shortCodeForStrategyId } from "@/lib/evaluate-strategy-ids";

import { STRATEGY_CANONICAL_NAMES } from "@/lib/strategy-display";

import { getEvaluateStrategySettings } from "@/server/actions/evaluate-strategy-settings";

import { setFinanceAiEvaluateStrategyIds } from "@/server/actions/finance-ai-schedules";

import { CollapseToggleButton } from "@/components/CollapseChevron";



type Props = {

  configured?: boolean;

  /** When true, omit outer section chrome (e.g. inside a modal). */

  embedded?: boolean;

  onSaved?: (effectiveIds: string[]) => void;

};



export function EvaluateStrategiesSettingsPanel({

  configured = true,

  embedded = false,

  onSaved,

}: Props) {

  const [open, setOpen] = useState(true);

  const [loading, setLoading] = useState(false);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [message, setMessage] = useState<string | null>(null);

  const [selected, setSelected] = useState<string[]>(["estrategia-01"]);

  const [effective, setEffective] = useState<string[]>(["estrategia-01"]);

  const [configuredInMysql, setConfiguredInMysql] = useState(false);

  const [configuredInAws, setConfiguredInAws] = useState(false);

  const [catalog, setCatalog] = useState<

    { id: string; title: string; shortCode?: string }[]

  >([]);



  const strategyLabel = (strategyId: string, title?: string) =>

    title?.trim() || STRATEGY_CANONICAL_NAMES[strategyId] || strategyId;



  const load = useCallback(async () => {

    setLoading(true);

    setError(null);

    const snapshot = await getEvaluateStrategySettings();

    setLoading(false);

    setCatalog(snapshot.catalog);

    setEffective(snapshot.effective);

    setSelected(snapshot.selected);

    setConfiguredInMysql(snapshot.configuredInMysql);

    setConfiguredInAws(snapshot.configuredInAws);

  }, []);



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

    if (selected.length === 0) return;

    setSaving(true);

    setError(null);

    setMessage(null);

    const result = await setFinanceAiEvaluateStrategyIds(selected);

    setSaving(false);

    if (!result.success) {

      setError(result.error ?? "No se pudo guardar");

      return;

    }

    const snapshot = await getEvaluateStrategySettings();
    setCatalog(snapshot.catalog);
    setEffective(snapshot.effective);
    setSelected(snapshot.selected);
    setConfiguredInMysql(snapshot.configuredInMysql);
    setConfiguredInAws(snapshot.configuredInAws);

    const awsNote = result.awsWarning

      ? ` AWS: ${result.awsWarning} (selección guardada en MySQL).`

      : configured

        ? " Sincronizado con AWS."

        : "";

    setMessage(

      `Guardado en MySQL · PRE, NOW y POST evaluarán ${snapshot.effective.length} estrategia(s).${awsNote}`

    );

    onSaved?.(snapshot.effective);

  };



  const body = (

        <div className={embedded ? "space-y-3" : "px-4 py-3 space-y-3"}>

          {!configured && (

            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded p-2">

              FinanceAI no configurado — la selección se guarda en MySQL; AWS no se actualizará.

            </p>

          )}



          <div className="flex flex-wrap items-center gap-2 text-[10px]">

            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">

              Efectivo: {effective.map((id) => shortCodeForStrategyId(id)).join(", ") || "—"}

            </span>

            <span className="px-2 py-0.5 rounded bg-violet-50 text-violet-900 border border-violet-200">

              Catálogo AWS · {catalog.length} estrategia(s)

            </span>

            {configuredInMysql && (

              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-900 border border-emerald-200">

                MySQL

              </span>

            )}

            {configuredInAws && (

              <span className="px-2 py-0.5 rounded bg-sky-50 text-sky-900 border border-sky-200">

                AWS schedules

              </span>

            )}

            {!configuredInMysql && !configuredInAws && (

              <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200">

                Default: primera publicada (e01)

              </span>

            )}

          </div>



          <ul className="space-y-2">

            {catalog.map((entry) => {

              const strategyId = entry.id;

              const checked = selected.includes(strategyId);

              const label = strategyLabel(strategyId, entry.title);

              const code = entry.shortCode ?? shortCodeForStrategyId(strategyId);

              return (

                <li key={strategyId}>

                  <label className="flex items-start gap-2 text-sm cursor-pointer">

                    <input

                      type="checkbox"

                      className="mt-1"

                      checked={checked}

                      disabled={loading || saving}

                      onChange={() => toggle(strategyId)}

                    />

                    <span>

                      <span className="font-medium text-investep-navy">

                        {code.toUpperCase()} · {label}

                      </span>

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

              disabled={saving || selected.length === 0}

              onClick={() => void save()}

            >

              {saving ? "Guardando…" : "Guardar"}

            </button>

            <button

              type="button"

              className="text-xs px-3 py-1.5 rounded border border-slate-300 text-slate-700 disabled:opacity-50"

              disabled={loading}

              onClick={() => void load()}

            >

              {loading ? "Cargando…" : "Recargar"}

            </button>

          </div>



          {error && <p className="text-xs text-red-700">{error}</p>}

          {message && <p className="text-xs text-emerald-800">{message}</p>}

        </div>

  );



  if (embedded) {

    return (

      <div className="space-y-3">

        <p className="text-xs text-gray-600">

          Catálogo desde <strong>playbook-current</strong> (AWS). Selección en MySQL (e01–e05) y

          sincronizada a schedules en AWS cuando está disponible.

        </p>

        {body}

      </div>

    );

  }



  return (

    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">

      <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-slate-100">

        <div>

          <p className="text-xs uppercase tracking-wider text-investep-gold">Market AI</p>

          <h2 className="font-semibold text-investep-navy text-sm">

            Estrategias a evaluar (PRE · NOW · POST)

          </h2>

          <p className="text-xs text-gray-600 mt-1">

            Catálogo desde AWS playbook-current. La selección se guarda en MySQL y se envía a

            POST /tickers/check; también se sincroniza a scheduleSettings en AWS.

          </p>

        </div>

        <CollapseToggleButton open={open} onToggle={() => setOpen((v) => !v)} />

      </div>



      {open && body}

    </section>

  );

}

