"use client";

import type { FinanceAiMov15mStatus } from "@/lib/finance-ai-types";
import type { E03OutsideTickerRow } from "@/lib/e03-outside-display";
import { hasBb15SessionResults } from "@/lib/bb15-fast-display";
import { Mov15mInsidePanel } from "@/components/gestion/Mov15mInsidePanel";
import { E03OutsideBolingerPanel } from "@/components/gestion/E03OutsideBolingerPanel";
import {
  useMov15mSession,
  useMov15mWindowActive,
} from "@/components/gestion/use-mov15m";

type Props = {
  financeAiConfigured?: boolean;
  initialStatus?: FinanceAiMov15mStatus | null;
  persistedAt?: string | null;
  /** Config → Tickers → Movimiento 15M (MySQL); authoritative list for Inside/Outside panels. */
  configWatchlist?: string[];
  e03InitialRows?: E03OutsideTickerRow[];
  e03PersistedAt?: string | null;
};

export function Mov15mWorkspace({
  financeAiConfigured = true,
  initialStatus = null,
  persistedAt = null,
  configWatchlist = [],
  e03InitialRows = [],
  e03PersistedAt = null,
}: Props) {
  const mov15mWindowActive = useMov15mWindowActive();
  const { loading, status, reload, applyStatus } = useMov15mSession(
    0,
    0,
    true,
    false,
    initialStatus,
    true
  );

  const hasSessionResults = hasBb15SessionResults(status);

  if (!financeAiConfigured) {
    return (
      <div className="space-y-4">
        {initialStatus ? (
          <>
            {persistedAt ? (
              <p className="text-xs text-gray-500">
                Última evaluación guardada en MySQL · {persistedAt.slice(0, 19).replace("T", " ")}
              </p>
            ) : null}
            <Mov15mInsidePanel
              status={initialStatus}
              loading={false}
              windowActive={mov15mWindowActive}
              hasSessionResults={hasSessionResults}
              open
              standalone
              onRefresh={reload}
              onStatusUpdate={applyStatus}
              placement="inside"
              showHeaderActions={false}
              panelId="journey-bb15-inside"
              configWatchlist={configWatchlist}
            />
            <E03OutsideBolingerPanel
              financeAiConfigured={false}
              configWatchlist={configWatchlist}
              initialRows={e03InitialRows}
              persistedAt={e03PersistedAt}
              open
              standalone
              panelId="journey-e03-outside"
            />
          </>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-900">
            <p className="font-medium">FinanceAI no configurado</p>
            <p className="mt-1 text-xs">Configura FINANCE_AI_API_URL y FINANCE_AI_API_KEY en .env</p>
          </div>
        )}
      </div>
    );
  }

  const sharedPanelProps = {
    status,
    loading,
    windowActive: mov15mWindowActive,
    hasSessionResults,
    standalone: true as const,
    onRefresh: reload,
    onStatusUpdate: applyStatus,
  };

  return (
    <div className="space-y-4">
      {persistedAt || e03PersistedAt ? (
        <p className="text-xs text-gray-500">
          {persistedAt ? (
            <>
              Inside · MySQL {persistedAt.slice(0, 19).replace("T", " ")}
            </>
          ) : null}
          {persistedAt && e03PersistedAt ? " · " : null}
          {e03PersistedAt ? (
            <>
              Outside E03 · MySQL {e03PersistedAt.slice(0, 19).replace("T", " ")}
            </>
          ) : null}
          {" · Evaluate = parámetros en cada panel"}
        </p>
      ) : null}
      <Mov15mInsidePanel
        {...sharedPanelProps}
        placement="inside"
        showHeaderActions
        panelId="journey-bb15-inside"
        configWatchlist={configWatchlist}
      />
      <E03OutsideBolingerPanel
        financeAiConfigured={financeAiConfigured}
        configWatchlist={configWatchlist}
        initialRows={e03InitialRows}
        persistedAt={e03PersistedAt}
        standalone
        panelId="journey-e03-outside"
      />
    </div>
  );
}
