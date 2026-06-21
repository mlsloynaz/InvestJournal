"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { FinanceAiScheduleSettings } from "@/server/services/finance-ai-client";
import { setFinanceAiAlertsEnabled } from "@/server/actions/finance-ai";
import {
  getFinanceAiScheduleSettings,
  setFinanceAiBuySellEnabled,
  setFinanceAiScheduleRuleEnabled,
  setFinanceAiScheduledJobsEnabled,
  syncFinanceAiWatchlistFromBolinger15,
  syncFinanceAiWatchlistFromFavorites,
  triggerFinanceAiDailyMaintenance,
} from "@/server/actions/finance-ai-schedules";
import { CollapsibleConfigSection } from "@/components/config/CollapsibleConfigSection";

type Props = {
  configured: boolean;
  favoriteSymbols: string[];
  bolinger15Symbols: string[];
  initialSettings: FinanceAiScheduleSettings | null;
  initialError?: string | null;
};

const SCHEDULE_META: Record<string, { label: string; when: string }> = {
  "finance-ai-news-920-et": {
    label: "News sentiment",
    when: "9:20 ET · lun–vie",
  },
  "finance-ai-premarket-700-et": {
    label: "Premarket PRE",
    when: "7:00 ET · lun–vie",
  },
  "finance-ai-postmarket-5pm-et": {
    label: "Post-market POST",
    when: "17:00 ET · lun–vie",
  },
  "finance-ai-now-minute-et": {
    label: "NOW automático",
    when: "9:30–15:00 ET · 1 cron/min → grupos 1/5/10/30/60m en código",
  },
  "finance-ai-bolinger-15-change-trend-930-et": {
    label: "Mov15m sesión",
    when: "9:30:30–10:00 ET · 1m todos los tickers listos",
  },
  "finance-ai-bolinger-15-change-trend-1000-et": {
    label: "Mov15m validación 10:00",
    when: "10:00 ET · 2 velas apertura",
  },
  "finance-ai-mov15m-930-et": {
    label: "Mov15m sesión",
    when: "9:30:30–10:00 ET · 1m todos los tickers listos",
  },
  "finance-ai-mov15m-1000-et": {
    label: "Mov15m validación 10:00",
    when: "10:00 ET · 2 velas apertura",
  },
  "finance-ai-daily-maintenance-400-et": {
    label: "Recopilar barras — grupo 1/3",
    when: "4:00 ET · D/1h/15m",
  },
  "finance-ai-daily-maintenance-410-et": {
    label: "Recopilar barras — grupo 2/3",
    when: "4:10 ET · D/1h/15m",
  },
  "finance-ai-daily-maintenance-420-et": {
    label: "Recopilar barras — grupo 3/3",
    when: "4:20 ET · D/1h/15m",
  },
  "finance-ai-daily-maintenance-430-et": {
    label: "Recopilar — retry + intake",
    when: "4:30 ET · retry errores · eval foundation",
  },
  "finance-ai-market-calendar-monthly": {
    label: "Calendario mercado",
    when: "día 1 · 06:00 UTC",
  },
};

function ruleStatusTone(state: string): string {
  if (state === "ENABLED") return "text-green-700";
  if (state === "DISABLED") return "text-red-700";
  if (state === "NOT_FOUND") return "text-amber-700";
  return "text-gray-600";
}

function ruleStatusLabel(state: string): string {
  if (state === "ENABLED") return "Activo";
  if (state === "DISABLED") return "Desactivado";
  if (state === "NOT_FOUND") return "No encontrado";
  if (state === "ERROR") return "Error";
  return state;
}

function ruleIsActive(state: string): boolean {
  return state === "ENABLED";
}

export function FinanceAiSchedulesPanel({
  configured,
  favoriteSymbols,
  bolinger15Symbols,
  initialSettings,
  initialError,
}: Props) {
  const [settings, setSettings] = useState(initialSettings);
  const [message, setMessage] = useState<string | null>(initialError ?? null);
  const [pending, startTransition] = useTransition();
  const [togglingRule, setTogglingRule] = useState<string | null>(null);
  const [togglingAlerts, setTogglingAlerts] = useState(false);
  const [togglingBuySell, setTogglingBuySell] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshingDailyMaintenance, setRefreshingDailyMaintenance] = useState(false);
  const [dailyMaintenanceLive, setDailyMaintenanceLive] = useState<
    FinanceAiScheduleSettings["dailyMaintenance"] | null
  >(initialSettings?.dailyMaintenance ?? null);

  if (!configured) {
    return (
      <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded p-3">
        Configura <code className="text-xs">FINANCE_AI_API_URL</code> y{" "}
        <code className="text-xs">FINANCE_AI_API_KEY</code> en el entorno para controlar
        los jobs programados en AWS.
      </p>
    );
  }

  const enabled = settings?.scheduledJobsEnabled ?? true;
  const alertsEnabled = settings?.alertsEnabled ?? true;
  const buySellEnabled = settings?.buySellEnabled ?? false;
  const buySellTickers = Array.isArray(settings?.buySellTickers) ? settings.buySellTickers : [];
  const watchlist = Array.isArray(settings?.watchlist) ? settings.watchlist : favoriteSymbols;
  const bb15ToSync = bolinger15Symbols;
  const rules = Array.isArray(settings?.rules) ? settings.rules : [];
  const dailyMaintenance = dailyMaintenanceLive ?? settings?.dailyMaintenance;
  const activeRules = rules.filter((r) => r.state === "ENABLED").length;
  const jobsSubtitle = `EventBridge + Scheduler · ${
    enabled ? "Permite ejecución" : "Bloqueado"
  } · ${activeRules}/${rules.length} activos`;

  function onToggleAll() {
    startTransition(async () => {
      setMessage(null);
      const result = await setFinanceAiScheduledJobsEnabled(!enabled);
      if (!result.success) {
        setMessage(result.error ?? "No se pudo actualizar.");
        return;
      }
      setSettings(result.settings ?? null);
      setMessage(
        !enabled
          ? "Todos los schedules activados en EventBridge."
          : "Todos los schedules desactivados en AWS."
      );
    });
  }

  function onToggleRule(ruleName: string, currentlyActive: boolean) {
    setTogglingRule(ruleName);
    setMessage(null);
    startTransition(async () => {
      const result = await setFinanceAiScheduleRuleEnabled(ruleName, !currentlyActive);
      setTogglingRule(null);
      if (!result.success) {
        setMessage(result.error ?? "No se pudo actualizar el schedule.");
        return;
      }
      setSettings(result.settings ?? null);
      const meta = SCHEDULE_META[ruleName];
      const updated = result.settings?.rules?.find((r) => r.name === ruleName);
      const expected = !currentlyActive ? "ENABLED" : "DISABLED";
      if (updated && updated.state !== expected) {
        setMessage(
          `${meta?.label ?? ruleName}: AWS sigue en «${ruleStatusLabel(updated.state)}»` +
            (updated.error ? ` — ${updated.error}` : "")
        );
        return;
      }
      setMessage(
        `${meta?.label ?? ruleName} ${!currentlyActive ? "activado" : "desactivado"}.`
      );
    });
  }

  function onSyncFavorites() {
    startTransition(async () => {
      setMessage(null);
      const result = await syncFinanceAiWatchlistFromFavorites();
      if (!result.success) {
        setMessage(result.error ?? "No se pudo sincronizar.");
        return;
      }
      setSettings(result.settings ?? null);
      setMessage("Watchlist PRE/POST enviada a AWS desde ★ favoritos.");
    });
  }

  function onSyncBolinger15() {
    startTransition(async () => {
      setMessage(null);
      const result = await syncFinanceAiWatchlistFromBolinger15();
      if (!result.success) {
        setMessage(result.error ?? "No se pudo sincronizar Movimiento 15M.");
        return;
      }
      setSettings(result.settings ?? null);
      setMessage("Watchlist PRE/POST enviada a AWS desde Movimiento 15M.");
    });
  }

  function onToggleAlerts() {
    setTogglingAlerts(true);
    setMessage(null);
    startTransition(async () => {
      const result = await setFinanceAiAlertsEnabled(!alertsEnabled);
      setTogglingAlerts(false);
      if (!result.success) {
        setMessage(result.error ?? "No se pudo actualizar alertas.");
        return;
      }
      setSettings((prev) =>
        prev
          ? {
              ...prev,
              alertsEnabled: result.alertsEnabled ?? !alertsEnabled,
              updatedAt: result.updatedAt ?? prev.updatedAt,
            }
          : null
      );
      setMessage(
        result.alertsEnabled ?? !alertsEnabled
          ? "Alertas estrategia activadas en AWS."
          : "Alertas estrategia desactivadas en AWS."
      );
    });
  }

  function onToggleBuySell() {
    setTogglingBuySell(true);
    setMessage(null);
    startTransition(async () => {
      const result = await setFinanceAiBuySellEnabled(!buySellEnabled);
      setTogglingBuySell(false);
      if (!result.success) {
        setMessage(result.error ?? "No se pudo actualizar Buy/Sell.");
        return;
      }
      setSettings(result.settings ?? null);
      setMessage(
        result.settings?.buySellEnabled
          ? "Buy/Sell activado — configura tickers en Config → Tickers."
          : "Buy/Sell desactivado en AWS."
      );
    });
  }

  function onRefreshStatus() {
    setRefreshing(true);
    setMessage(null);
    startTransition(async () => {
      const result = await getFinanceAiScheduleSettings();
      setRefreshing(false);
      if (!result.success) {
        setMessage(result.error ?? "No se pudo leer estado AWS.");
        return;
      }
      setSettings(result.settings ?? null);
      setDailyMaintenanceLive(result.settings?.dailyMaintenance ?? null);
      setMessage("Estado AWS actualizado desde EventBridge.");
    });
  }

  function onTriggerDailyMaintenance() {
    setRefreshingDailyMaintenance(true);
    setMessage(null);
    setDailyMaintenanceLive((prev) => ({
      ...(prev ?? {}),
      lastRunStatus: "running",
      lastRunSource: "adhoc",
      lastRunMessage: "Recolección histórica en curso (D/1h/15m)…",
      lastRunAt: new Date().toISOString(),
    }));
    startTransition(async () => {
      try {
        const result = await triggerFinanceAiDailyMaintenance();
        if (!result.success) {
          setMessage(result.error ?? "No se pudo ejecutar la recolección histórica.");
          return;
        }
        if (result.settings) {
          setSettings(result.settings);
          setDailyMaintenanceLive(result.settings.dailyMaintenance ?? null);
        } else if (result.status) {
          setDailyMaintenanceLive(result.status);
          setSettings((prev) => ({
            scheduledJobsEnabled: prev?.scheduledJobsEnabled ?? true,
            watchlist: prev?.watchlist ?? watchlist,
            ...prev,
            dailyMaintenance: result.status,
          }));
        }
        const status = result.status;
        const ok = status?.lastRunOk;
        const total = status?.lastRunSymbolCount;
        const failed = status?.lastRunFailed;
        if (status?.lastRunStatus === "skipped") {
          setMessage(
            status.lastRunSkipReason
              ? `Recolección omitida: ${status.lastRunSkipReason}`
              : "Recolección omitida."
          );
        } else if (ok != null && total != null) {
          setMessage(
            `Recolección completada — ${ok}/${total} tickers OK` +
              (failed ? ` · ${failed} error` : "") +
              " (D/1h/15m en Dynamo)."
          );
        } else {
          setMessage(status?.lastRunMessage ?? "Recolección histórica completada.");
        }
      } finally {
        setRefreshingDailyMaintenance(false);
      }
    });
  }

  function formatUtcTimestamp(value?: string | null): string {
    if (!value) return "—";
    return value.slice(0, 19).replace("T", " ") + " UTC";
  }

  return (
    <div className="space-y-4">
      <section className="bg-white border rounded-lg p-4 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-semibold text-investep-navy">Alertas estrategia (AWS)</h2>
            <p className="text-xs text-gray-600 mt-1">
              Cuando NOW detecta una estrategia 100% cumplida, FinanceAI guarda la alerta en
              DynamoDB. Con esto desactivado, los jobs no generan alertas nuevas.
            </p>
          </div>
          <button
            type="button"
            onClick={onToggleAlerts}
            disabled={pending}
            className={
              alertsEnabled
                ? "text-sm font-medium !text-white px-4 py-2 rounded-lg shadow-md disabled:opacity-50 !bg-red-700 hover:!bg-red-800"
                : "text-sm font-medium !text-white px-4 py-2 rounded-lg shadow-md disabled:opacity-50 !bg-green-700 hover:!bg-green-800"
            }
          >
            {pending && togglingAlerts ? "…" : alertsEnabled ? "Desactivar alertas" : "Activar alertas"}
          </button>
        </div>
        <p className="text-sm">
          Estado en AWS:{" "}
          <span
            className={
              alertsEnabled ? "text-green-700 font-medium" : "text-red-700 font-medium"
            }
          >
            {alertsEnabled ? "Activas" : "Desactivadas"}
          </span>
        </p>
      </section>

      <section className="bg-white border rounded-lg p-4 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-semibold text-investep-navy">Buy / Sell (AWS)</h2>
            <p className="text-xs text-gray-600 mt-1">
              Activa o desactiva Buy/Sell globalmente. La lista de tickers se gestiona en{" "}
              <Link href="/config/tickers" className="text-sky-800 underline underline-offset-2">
                Config → Tickers
              </Link>
              .
            </p>
          </div>
          <button
            type="button"
            onClick={onToggleBuySell}
            disabled={pending}
            className={
              buySellEnabled
                ? "text-sm font-medium !text-white px-4 py-2 rounded-lg shadow-md disabled:opacity-50 !bg-red-700 hover:!bg-red-800"
                : "text-sm font-medium !text-white px-4 py-2 rounded-lg shadow-md disabled:opacity-50 !bg-green-700 hover:!bg-green-800"
            }
          >
            {pending && togglingBuySell ? "…" : buySellEnabled ? "Desactivar Buy/Sell" : "Activar Buy/Sell"}
          </button>
        </div>
        <p className="text-sm">
          Estado en AWS:{" "}
          <span
            className={
              buySellEnabled ? "text-green-700 font-medium" : "text-red-700 font-medium"
            }
          >
            {buySellEnabled ? "Activado" : "Desactivado"}
          </span>
          {buySellEnabled ? (
            <span className="text-gray-500 text-xs ml-2">
              · {buySellTickers.length} ticker{buySellTickers.length === 1 ? "" : "s"} en lista (
              <Link href="/config/tickers" className="text-sky-800 underline underline-offset-2">
                editar
              </Link>
              )
            </span>
          ) : null}
        </p>
      </section>

      <CollapsibleConfigSection
        title="Jobs programados AWS"
        subtitle={jobsSubtitle}
        headerExtra={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onRefreshStatus}
              disabled={pending}
              title="Consulta EventBridge y DynamoDB sin cambiar configuración"
              className="text-sm font-medium px-3 py-2 rounded-lg border border-slate-300 text-investep-navy bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {refreshing ? "…" : "Actualizar estado AWS"}
            </button>
            <button
              type="button"
              onClick={onToggleAll}
              disabled={pending}
              className={
                enabled
                  ? "text-sm font-medium !text-white px-4 py-2 rounded-lg shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-shadow !bg-red-700 hover:!bg-red-800"
                  : "text-sm font-medium !text-white px-4 py-2 rounded-lg shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-shadow !bg-green-700 hover:!bg-green-800"
              }
            >
              {pending && !togglingRule && !refreshing
                ? "…"
                : enabled
                  ? "Desactivar todos"
                  : "Activar todos"}
            </button>
          </div>
        }
      >
        <p className="text-xs text-gray-600">
          NOW usa un solo schedule por minuto; los intervalos 1/5/10/30/60m se resuelven en Lambda
          por grupo (Tickers → intervalo NOW).
        </p>
        <p className="text-sm">
          Flag global:{" "}
          <span className={enabled ? "text-green-700 font-medium" : "text-red-700 font-medium"}>
            {enabled ? "Permite ejecución" : "Bloqueado"}
          </span>
          {settings?.updatedAt ? (
            <span className="text-gray-500 text-xs ml-2">
              (actualizado {settings.updatedAt.slice(0, 19).replace("T", " ")} UTC)
            </span>
          ) : null}
        </p>

        <div className="overflow-x-auto border border-gray-100 rounded-lg">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b bg-slate-50/80">
                <th className="py-2 px-3 font-medium">Schedule</th>
                <th className="py-2 px-3 font-medium">Horario</th>
                <th className="py-2 px-3 font-medium">Estado AWS</th>
                <th className="py-2 px-3 font-medium text-right">Acción</th>
              </tr>
            </thead>
            <tbody>
              {rules.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-3 px-3 text-xs text-gray-500">
                    Sin datos de schedules — recarga la página o revisa la conexión con FinanceAI.
                  </td>
                </tr>
              ) : (
                rules.map((rule) => {
                  const meta = SCHEDULE_META[rule.name];
                  const active = ruleIsActive(rule.state);
                  const busy = pending && togglingRule === rule.name;
                  return (
                    <tr key={rule.name} className="border-b border-gray-100 last:border-b-0">
                      <td className="py-2.5 px-3">
                        <p className="font-medium text-investep-navy">
                          {meta?.label ?? rule.name}
                        </p>
                        <p className="text-[10px] font-mono text-gray-400 mt-0.5">{rule.name}</p>
                      </td>
                      <td className="py-2.5 px-3 text-xs text-gray-600">
                        {meta?.when ?? "—"}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`text-xs font-medium ${ruleStatusTone(rule.state)}`}>
                          {ruleStatusLabel(rule.state)}
                        </span>
                        {rule.error ? (
                          <p className="text-[10px] text-red-600 mt-0.5">{rule.error}</p>
                        ) : null}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          disabled={pending || rule.state === "NOT_FOUND"}
                          onClick={() => onToggleRule(rule.name, active)}
                          className={
                            active
                              ? "text-xs px-2.5 py-1 rounded border border-red-300 text-red-800 bg-red-50 hover:bg-red-100 disabled:opacity-40"
                              : "text-xs px-2.5 py-1 rounded border border-green-500 text-green-900 bg-green-50 hover:bg-green-100 disabled:opacity-40"
                          }
                        >
                          {busy ? "…" : active ? "Desactivar" : "Activar"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </CollapsibleConfigSection>

      <section className="bg-white border rounded-lg p-4 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-semibold text-investep-navy">Histórico barras (1:00 ET)</h2>
            <p className="text-xs text-gray-600 mt-1">
              Job nocturno: <strong>D / 1h / 15m</strong>, calendario, checks y evaluación de
              estrategias → <code>PremarketAnalysis mode=foundation</code>. Noticias AV a las 9:20 ET.
              Sin Bedrock ni TickersToday.
            </p>
          </div>
          <button
            type="button"
            onClick={onTriggerDailyMaintenance}
            disabled={pending || refreshingDailyMaintenance}
            className="text-sm font-medium !text-white px-4 py-2 rounded-lg shadow-md disabled:opacity-50 !bg-investep-navy hover:!bg-investep-navy/90"
          >
            {refreshingDailyMaintenance ? "Recopilando…" : "Recopilar ahora"}
          </button>
        </div>
        {dailyMaintenance?.lastRunStatus === "running" || refreshingDailyMaintenance ? (
          <p className="text-xs text-blue-800 bg-blue-50 border border-blue-200 rounded px-3 py-2">
            Recopilando barras D/1h/15m en AWS… puede tardar varios minutos según tickers.
          </p>
        ) : null}
        {dailyMaintenance?.lastRunMessage &&
        dailyMaintenance.lastRunStatus !== "running" &&
        !refreshingDailyMaintenance ? (
          <p className="text-xs text-gray-700 bg-slate-50 border border-slate-200 rounded px-3 py-2">
            {dailyMaintenance.lastRunMessage}
          </p>
        ) : null}
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-gray-500">Última ejecución</dt>
            <dd>{formatUtcTimestamp(dailyMaintenance?.lastRunAt)}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Origen</dt>
            <dd>{dailyMaintenance?.lastRunSource ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Estado</dt>
            <dd>
              {dailyMaintenance?.lastRunStatus === "running" || refreshingDailyMaintenance
                ? "En curso…"
                : dailyMaintenance?.lastRunStatus ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Trade date</dt>
            <dd>{dailyMaintenance?.lastRunTradeDate ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Tickers</dt>
            <dd>
              {dailyMaintenance?.lastRunOk != null && dailyMaintenance?.lastRunSymbolCount != null
                ? `${dailyMaintenance.lastRunOk}/${dailyMaintenance.lastRunSymbolCount} OK`
                : "—"}
              {dailyMaintenance?.lastRunFailed
                ? ` · ${dailyMaintenance.lastRunFailed} error`
                : null}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Programado</dt>
            <dd>4:00–4:30 ET · grupos 1/2/3 + retry 4:30</dd>
          </div>
        </dl>
      </section>

      <section className="bg-white border rounded-lg p-4 space-y-3">
        <h2 className="font-semibold text-investep-navy">Watchlist PRE / POST</h2>
        <p className="text-xs text-gray-600">
          Los jobs PRE y POST usan la watchlist en AWS. Sincroniza desde ★ favoritos (MySQL) o desde
          la lista <strong>Movimiento 15M</strong> guardada en Tickers.
        </p>

        <div className="space-y-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
            ★ Favoritos (MySQL)
            {favoriteSymbols.length > 0 ? (
              <span className="normal-case font-normal text-gray-400 ml-1">
                · {favoriteSymbols.length} a sincronizar
              </span>
            ) : null}
          </p>
          <div className="flex flex-wrap gap-2">
            {favoriteSymbols.length === 0 ? (
              <span className="text-sm text-gray-500">Sin favoritos — marca ★ en Tickers.</span>
            ) : (
              favoriteSymbols.map((symbol) => (
                <span
                  key={symbol}
                  className="text-xs font-mono bg-investep-cream border border-investep-navy/20 rounded px-2 py-0.5"
                >
                  {symbol}
                </span>
              ))
            )}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
            Movimiento 15M (MySQL)
            {bb15ToSync.length > 0 ? (
              <span className="normal-case font-normal text-gray-400 ml-1">
                · {bb15ToSync.length} a sincronizar
              </span>
            ) : null}
          </p>
          <div className="flex flex-wrap gap-2">
            {bb15ToSync.length === 0 ? (
              <span className="text-sm text-gray-500">
                Sin lista 15M — marca tickers en Tickers → Movimiento 15M y guarda.
              </span>
            ) : (
              bb15ToSync.map((symbol) => (
                <span
                  key={symbol}
                  className="text-xs font-mono bg-investep-cream border border-investep-navy/20 rounded px-2 py-0.5"
                >
                  {symbol}
                </span>
              ))
            )}
          </div>
        </div>

        <p className="text-xs text-gray-500">
          En AWS PRE/POST ahora:{" "}
          {watchlist.length > 0 ? watchlist.join(", ") : "— (vacía, usa fallback deploy)"}
          {settings?.watchlistSource ? (
            <span className="ml-1">· origen: {settings.watchlistSource}</span>
          ) : null}
        </p>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onSyncFavorites}
            disabled={pending || favoriteSymbols.length === 0}
            className="text-sm px-3 py-2 rounded-lg border border-gray-300 text-investep-navy hover:bg-slate-50 disabled:opacity-50"
          >
            {pending && !togglingRule && !refreshing ? "…" : "Sincronizar ★ favoritos"}
          </button>
          <button
            type="button"
            onClick={onSyncBolinger15}
            disabled={pending || bb15ToSync.length === 0}
            className="text-sm px-3 py-2 rounded-lg border border-violet-400 text-violet-900 bg-violet-50 hover:bg-violet-100 disabled:opacity-50"
          >
            {pending && !togglingRule && !refreshing ? "…" : "Sincronizar Movimiento 15M"}
          </button>
        </div>
      </section>

      {message ? (
        <p
          className={`text-sm rounded p-3 border ${
            message.includes("No se") || message.includes("Error") || message.includes("falló")
              ? "text-red-800 bg-red-50 border-red-200"
              : "text-green-800 bg-green-50 border-green-200"
          }`}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
