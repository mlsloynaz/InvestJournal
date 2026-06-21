"use client";

import { useEffect, useState, useTransition } from "react";
import type { FinanceAiFomcMeeting, FinanceAiMonthCalendar } from "@/lib/finance-ai-types";
import { formatFinanceAiTimestamp } from "@/lib/format-datetime";
import {
  buildEarningsRowsFromCalendar,
  MarketAiCalendarModal,
} from "@/components/gestion/MarketAiCalendarModal";
import { CollapsibleConfigSection } from "@/components/config/CollapsibleConfigSection";
import {
  fetchFinanceAiMarketCalendar,
  publishAnalysisFrameworkToFinanceAi,
  publishStrategiesToFinanceAi,
  refreshFinanceAiMarketCalendar,
} from "@/server/actions/finance-ai";
import type { FinanceAiStoredCalendar } from "@/server/services/finance-ai-client";

type StoredCalendar = FinanceAiStoredCalendar;

type Props = {
  configured: boolean;
  strategiesUpdatedAt?: string;
  frameworkUpdatedAt?: string;
  initialCalendar?: StoredCalendar | null;
};

const BUTTON_ACTIONS = [
  {
    id: "strategies",
    label: "Estrategias",
    className: "text-xs border rounded px-2 py-1",
    onClickKey: "strategies" as const,
    summary: "Publica playbooks y requisitos a AWS",
    detail:
      "Lee los MD locales estrategia-*.md, arma el markdown consolidado y los playbooks estructurados, y los envía con PUT a /context/strategies (DynamoDB). NOW, PRE y BB15 usan este contexto para evaluar requisitos.",
  },
  {
    id: "framework",
    label: "Marco",
    className: "text-xs bg-investep-navy text-white rounded px-2 py-1",
    onClickKey: "framework" as const,
    summary: "Publica el marco de análisis a AWS",
    detail:
      "Exporta los elementos de análisis de InvestJournal (indicadores, reglas, temporalidades) y los envía con PUT a /context/analysis-framework. Lo consumen las evaluaciones con IA (PRE/NOW/POST).",
  },
  {
    id: "calendar",
    label: "Request Earning Calendar",
    className: "text-xs bg-amber-700 text-white rounded px-2 py-1",
    onClickKey: "calendarRefresh" as const,
    summary: "Fetch earnings from Finnhub for all Config tickers",
    detail:
      "Calls Finnhub once per symbol in the Config tickers table (skipped if this month is already stored). Opens the modal with FOMC + earnings.",
  },
  {
    id: "fomc",
    label: "Ver calendario",
    className: "text-xs border border-amber-700 text-amber-900 rounded px-2 py-1",
    onClickKey: "calendarView" as const,
    summary: "Solo lectura — no llama a Finnhub",
    detail:
      "GET del calendario ya guardado en AWS (sin refrescar). Abre el mismo modal con FOMC, earnings del mes y avisos; útil para revisar lo publicado sin volver a descargar datos.",
  },
] as const;

function calendarToMonthCal(cal: StoredCalendar): FinanceAiMonthCalendar | null {
  if (cal.monthCalendar) return cal.monthCalendar;
  if (cal.fomcEvents || cal.month) {
    return {
      month: cal.month,
      from: cal.from,
      to: cal.to,
      updatedAt: cal.updatedAt,
      fomcDates: cal.fomcEvents,
      fomcCount: cal.fomcCount,
      earningsCount: cal.earningsCount,
    };
  }
  return null;
}

function stateFromCalendar(cal: StoredCalendar | null | undefined) {
  if (!cal) {
    return {
      calendarAt: undefined as string | undefined,
      monthCal: null as FinanceAiMonthCalendar | null,
      earningsBySymbol: undefined as StoredCalendar["earningsBySymbol"],
      fomcWarning: null as string | null,
      fomcMeetings: [] as FinanceAiFomcMeeting[],
    };
  }
  return {
    calendarAt: cal.updatedAt,
    monthCal: calendarToMonthCal(cal),
    earningsBySymbol: cal.earningsBySymbol,
    fomcWarning: cal.fomcScheduleWarning ?? null,
    fomcMeetings: cal.fomcMeetings ?? [],
  };
}

export function GlobalContextPanel({
  configured,
  strategiesUpdatedAt,
  frameworkUpdatedAt,
  initialCalendar,
}: Props) {
  const initial = stateFromCalendar(initialCalendar);
  const [strategiesAt, setStrategiesAt] = useState(strategiesUpdatedAt);
  const [frameworkAt, setFrameworkAt] = useState(frameworkUpdatedAt);
  const [calendarAt, setCalendarAt] = useState(initial.calendarAt);
  const [monthCal, setMonthCal] = useState(initial.monthCal);
  const [earningsBySymbol, setEarningsBySymbol] = useState(initial.earningsBySymbol);
  const [fomcWarning, setFomcWarning] = useState(initial.fomcWarning);
  const [fomcMeetings, setFomcMeetings] = useState(initial.fomcMeetings);
  const [modalOpen, setModalOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setStrategiesAt(strategiesUpdatedAt);
  }, [strategiesUpdatedAt]);

  useEffect(() => {
    setFrameworkAt(frameworkUpdatedAt);
  }, [frameworkUpdatedAt]);

  useEffect(() => {
    const next = stateFromCalendar(initialCalendar);
    setCalendarAt(next.calendarAt);
    setMonthCal(next.monthCal);
    setEarningsBySymbol(next.earningsBySymbol);
    setFomcWarning(next.fomcWarning);
    setFomcMeetings(next.fomcMeetings);
  }, [initialCalendar]);

  function applyCalendar(cal: StoredCalendar) {
    const next = stateFromCalendar(cal);
    setCalendarAt(next.calendarAt);
    setMonthCal(next.monthCal);
    setEarningsBySymbol(next.earningsBySymbol);
    setFomcWarning(next.fomcWarning);
    setFomcMeetings(next.fomcMeetings);
  }

  function applyCalendarResponse(
    r: Awaited<ReturnType<typeof fetchFinanceAiMarketCalendar>>
  ) {
    if (r.success && r.calendar) {
      applyCalendar(r.calendar);
    }
  }

  function openSavedCalendar() {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const r = await fetchFinanceAiMarketCalendar();
      if (r.success && r.calendar) {
        applyCalendarResponse(r);
        setModalOpen(true);
      } else {
        setError(r.error ?? "No se pudo cargar el calendario");
      }
    });
  }

  function refreshAndShowCalendar() {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await refreshFinanceAiMarketCalendar();
      if (result.success) {
        setMessage(result.message ?? "Calendario actualizado");
        if (result.calendar) {
          applyCalendar(result.calendar);
        } else {
          const r = await fetchFinanceAiMarketCalendar();
          if (r.success && r.calendar) {
            applyCalendarResponse(r);
          } else if (result.updatedAt) {
            setCalendarAt(result.updatedAt);
          }
        }
        setModalOpen(true);
      } else {
        setError(result.error ?? "Error al actualizar calendario");
      }
    });
  }

  function run(
    action: () => Promise<{ success: boolean; message?: string; error?: string; updatedAt?: string }>,
    onUpdated: (iso: string | undefined) => void
  ) {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.success) {
        setMessage(result.message ?? "Publicado");
        if (result.updatedAt) onUpdated(result.updatedAt);
      } else {
        setError(result.error ?? "Error al publicar");
      }
    });
  }

  function handleButtonClick(key: (typeof BUTTON_ACTIONS)[number]["onClickKey"]) {
    if (key === "strategies") {
      run(publishStrategiesToFinanceAi, setStrategiesAt);
      return;
    }
    if (key === "framework") {
      run(publishAnalysisFrameworkToFinanceAi, setFrameworkAt);
      return;
    }
    if (key === "calendarRefresh") {
      refreshAndShowCalendar();
      return;
    }
    openSavedCalendar();
  }

  const earningsRows = buildEarningsRowsFromCalendar(monthCal, earningsBySymbol);

  if (!configured) {
    return (
      <CollapsibleConfigSection
        title="Global Context"
        subtitle="Contexto compartido en DynamoDB para evaluaciones FinanceAI"
        defaultOpen
      >
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded p-3">
          Configura <code className="text-xs">FINANCE_AI_API_URL</code> y{" "}
          <code className="text-xs">FINANCE_AI_API_KEY</code> para publicar estrategias, marco y
          calendario en AWS.
        </p>
      </CollapsibleConfigSection>
    );
  }

  return (
    <>
      <MarketAiCalendarModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        monthCal={monthCal}
        fomcMeetings={fomcMeetings}
        earningsRows={earningsRows}
        lastUpdate={calendarAt}
        fomcWarning={fomcWarning}
      />

      <CollapsibleConfigSection
        title="Global Context"
        subtitle="Publica estrategias, marco de análisis y calendario de mercado en DynamoDB (AWS)"
        defaultOpen
      >
        <div className="space-y-3 text-xs">
          {BUTTON_ACTIONS.map((btn) => (
            <div
              key={btn.id}
              className="flex flex-wrap items-start gap-2 border border-gray-100 rounded-lg p-2.5"
            >
              <button
                type="button"
                disabled={pending}
                onClick={() => handleButtonClick(btn.onClickKey)}
                className={`shrink-0 disabled:opacity-50 ${btn.className}`}
              >
                {btn.label}
              </button>
              <div className="min-w-0 flex-1 text-gray-700 leading-snug">
                <p className="font-medium text-investep-navy">{btn.summary}</p>
                <p className="mt-0.5 text-gray-600">{btn.detail}</p>
              </div>
            </div>
          ))}

          <div className="rounded-lg bg-gray-50 border border-gray-100 p-2.5 space-y-1 text-gray-600">
            <p>
              <span className="font-medium text-gray-800">Estrategias en AWS:</span>{" "}
              {strategiesAt ? formatFinanceAiTimestamp(strategiesAt) : "—"}
            </p>
            <p>
              <span className="font-medium text-gray-800">Marco en AWS:</span>{" "}
              {frameworkAt ? formatFinanceAiTimestamp(frameworkAt) : "—"}
            </p>
            <p>
              <span className="font-medium text-gray-800">Calendario en AWS:</span>{" "}
              {calendarAt ? formatFinanceAiTimestamp(calendarAt) : "—"}
              {monthCal?.month && (
                <span>
                  {" "}
                  · {monthCal.month}: FOMC {monthCal.fomcCount ?? 0} · earnings{" "}
                  {monthCal.earningsCount ?? earningsRows.length}
                </span>
              )}
            </p>
          </div>

          {fomcWarning && (
            <p className="text-amber-900 bg-amber-50 border border-amber-200 rounded p-2">
              {fomcWarning}
            </p>
          )}

          {pending && <p className="text-gray-500">Enviando…</p>}
          {message && <p className="text-green-700">{message}</p>}
          {error && <p className="text-red-700">{error}</p>}
        </div>
      </CollapsibleConfigSection>
    </>
  );
}
