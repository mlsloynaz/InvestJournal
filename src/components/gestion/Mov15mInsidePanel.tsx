"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type {
  FinanceAiMov15mStatus,
  FinanceAiMov15mTicker,
} from "@/lib/finance-ai-types";
import {
  bb15TickerMatchesPlacement,
  bb15TickerVisibleInList,
  formatBb15ExcludeReason,
  hasBb15SessionResults,
  hasBb15TickerSessionData,
  partitionBb15TickerRows,
  resolveBb15CollapsedTickerBadge,
  resolveBb15DecisionTiming,
  resolveBb15PredictedDirection,
  resolveBb15Prediction,
  resolveBb15RulesGrouped,
  resolveBb15RulesPanel,
  resolveBb15RulesScoreView,
  resolveBb15ScoreColorStyle,
  resolveBb15TickerSignal,
  type Bb15BollingerPlacement,
  type Bb15PredictedDirectionView,
  type Bb15PredictionView,
  type Bb15RuleItem,
  type Bb15RulesScoreView,
} from "@/lib/bb15-fast-display";
import {
  defaultMov15mPollingParams,
  mov15mPollingToApiPayload,
} from "@/lib/mov15m-polling";
import {
  CollapsibleResultSection,
  TickerResultDetails,
} from "@/components/gestion/CollapsibleResultSection";
import {
  DecisionTimingBadge,
  StrategyCheckIcon,
  TickerCollapsedSummaryBadge,
} from "@/components/gestion/MovementTickerCollapsedBadge";
import { bb15RuleToStrategyCheck } from "@/lib/ticker-strategy-checks-map";
import { Mov15mExecutePanel } from "@/components/gestion/Mov15mExecutePanel";
import { Mov15mEvaluateControls } from "@/components/gestion/Mov15mEvaluateControls";
import { Mov15mPollingConfigButton } from "@/components/gestion/Mov15mPollingConfigButton";
import { Mov15mPollingConfigModal } from "@/components/gestion/Mov15mPollingConfigModal";
import { Bb15DirectionArrow } from "@/components/gestion/StrategyMetDirectionArrow";
import { applyMov15mTriggerResult } from "@/lib/mov15m-poll-wait";
import { triggerFinanceAiMov15mCheck } from "@/server/actions/finance-ai";
import { loadPersistedMov15mStatus } from "@/server/actions/mov15m-snapshot";
import {
  isBolinger15FastWindowEt,
  isTradingSessionDayEt,
} from "@/lib/live-session-window";

const WINDOW_CHECK_MS = 15_000;

function RuleIndicator({
  ok,
  pending,
  probable,
  aboutToCross,
}: {
  ok?: boolean;
  pending?: boolean;
  probable?: boolean;
  aboutToCross?: boolean;
}) {
  return (
    <StrategyCheckIcon
      status={
        ok === true
          ? "met"
          : aboutToCross
            ? "about_to_cross"
            : probable
              ? "partial"
              : pending
                ? "pending"
                : "not_met"
      }
    />
  );
}

const SCORE_BUBBLE_R = 18;
const SCORE_BUBBLE_SIZE = 44;

function Bb15ScoreBubble({
  score,
  size = "md",
  highlight = false,
}: {
  score: Bb15RulesScoreView;
  size?: "sm" | "md";
  highlight?: boolean;
}) {
  const usePercentage = score.usePercentage !== false;
  const colors = resolveBb15ScoreColorStyle(
    usePercentage ? score.pct : null,
    score.pending
  );
  const dim = size === "sm" ? 32 : SCORE_BUBBLE_SIZE;
  const r = size === "sm" ? 13 : SCORE_BUBBLE_R;
  const cx = dim / 2;
  const circ = 2 * Math.PI * r;
  const pct = score.pct ?? 0;
  const dashOffset = score.pending ? circ : circ - (pct / 100) * circ;
  const fontSize = size === "sm" ? "text-[9px]" : "text-xs";
  const summaryText = score.summaryLabel ?? score.shortLabel;

  return (
    <div
      className={`flex flex-col items-center shrink-0 ${highlight ? "relative" : ""}`}
      title={
        score.pending
          ? `${score.label} — pendiente`
          : usePercentage
            ? `${score.label} — ${score.pct}% (${score.met}/${score.total})`
            : `${score.label} — ${summaryText}`
      }
    >
      {highlight && (
        <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 text-[8px] font-semibold uppercase tracking-wide text-violet-700 bg-violet-100 px-1 rounded">
          último
        </span>
      )}
      <svg width={dim} height={dim} className={highlight ? "mt-2" : ""} aria-hidden>
        <circle
          cx={cx}
          cy={cx}
          r={r}
          fill={colors.fill}
          stroke={colors.track}
          strokeWidth={3}
        />
        {!score.pending && usePercentage && (
          <circle
            cx={cx}
            cy={cx}
            r={r}
            fill="none"
            stroke={colors.stroke}
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={dashOffset}
            transform={`rotate(-90 ${cx} ${cx})`}
          />
        )}
        <text
          x={cx}
          y={cx}
          textAnchor="middle"
          dominantBaseline="central"
          className={`${fontSize} font-bold fill-current ${colors.text}`}
          style={{ fontSize: usePercentage ? (size === "sm" ? 9 : 11) : size === "sm" ? 7 : 8 }}
        >
          {score.pending ? "—" : usePercentage ? `${score.pct}%` : "LC"}
        </text>
      </svg>
      {size === "md" && (
        <span className="text-[9px] tabular-nums text-gray-500 mt-0.5 text-center max-w-[5.5rem] leading-tight">
          {score.pending
            ? "pendiente"
            : usePercentage
              ? `${score.met}/${score.total}`
              : summaryText}
        </span>
      )}
    </div>
  );
}

function RulesBlock({
  title,
  score,
  rules,
  row,
}: {
  title: string;
  score: Bb15RulesScoreView;
  rules: Bb15RuleItem[];
  row: FinanceAiMov15mTicker;
}) {
  const grouped = resolveBb15RulesGrouped(row);

  const renderRuleList = (items: Bb15RuleItem[]) => (
    <ul className="space-y-1">
      {items.map((rule) => (
        <li key={rule.id} className="text-[10px] text-gray-700 flex gap-1 items-start">
          <RuleIndicator
            ok={rule.met}
            pending={rule.pending}
            probable={rule.probable}
            aboutToCross={rule.aboutToCross}
          />
          <span className="min-w-0 flex-1">
            <span className="block leading-snug">{rule.label}</span>
            {rule.detail ? (
              <span className="block text-[9px] text-gray-400 leading-snug">{rule.detail}</span>
            ) : null}
          </span>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="rounded border border-gray-100 bg-white/80 p-2 flex gap-2 min-w-0">
      <Bb15ScoreBubble score={score} />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold text-gray-800 leading-snug mb-1">{title}</p>
        {score.pending ? (
          <p className="text-[10px] text-orange-500">Pendiente — apertura 9:30 ET o pulsa Evaluate</p>
        ) : (
          <div className="space-y-2">
            {grouped.met.length > 0 && (
              <div>
                <p className="text-[9px] font-semibold text-green-700 mb-0.5">
                  Cumple ({grouped.met.length})
                </p>
                {renderRuleList(grouped.met)}
              </div>
            )}
            {grouped.notMet.length > 0 && (
              <div>
                <p className="text-[9px] font-semibold text-orange-600 mb-0.5">
                  No cumple ({grouped.notMet.length})
                </p>
                {renderRuleList(grouped.notMet)}
              </div>
            )}
            {grouped.met.length === 0 && grouped.notMet.length === 0 && renderRuleList(rules)}
          </div>
        )}
      </div>
    </div>
  );
}

function PredictedDirectionBlock({ view }: { view: Bb15PredictedDirectionView }) {
  const dirClass =
    view.direction === "up"
      ? "text-green-700"
      : view.direction === "down"
        ? "text-red-600"
        : "text-gray-500";
  return (
    <div className="text-[10px] mt-2">
      <span className="text-gray-600">Dirección prevista: </span>
      <span className={`font-bold ${dirClass}`}>{view.label}</span>
      {view.statusLabel && (
        <span className="block text-[9px] text-gray-500 mt-0.5">{view.statusLabel}</span>
      )}
    </div>
  );
}

function LastCheckPrediction({ view }: { view: Bb15PredictionView }) {
  return (
    <div className="mt-2 text-[10px]">
      <span className="text-gray-600">Entrada / seguimiento: </span>
      <span className={view.className}>{view.label}</span>
      {view.movePct != null && view.evaluated && (
        <span className="block text-[9px] text-gray-500 tabular-nums mt-0.5">
          {view.movePct > 0 ? "+" : ""}
          {view.movePct}% vs cierre ayer
        </span>
      )}
    </div>
  );
}

function Bb15TickerBody({
  row,
  buySellEnabled,
}: {
  row: FinanceAiMov15mTicker;
  buySellEnabled: boolean;
}) {
  const { summary, checks } = resolveBb15TickerSignal(row);
  const rulesPanel = resolveBb15RulesPanel(row);
  const score = resolveBb15RulesScoreView(row);
  const prediction = resolveBb15Prediction(row);
  const predictedDir = resolveBb15PredictedDirection(row);
  const eod = row.eodSetup;
  const pre = row.precheck928;
  const excludeReason = formatBb15ExcludeReason(
    row.reason ?? eod?.reason ?? (row.excluded ? "eod_vol_not_partially_closed" : undefined)
  );
  const hasAnyData = hasBb15TickerSessionData(row);
  const timing = resolveBb15DecisionTiming(row);
  const assessed =
    Boolean(row.manualAssessmentAt || row.lastAssessmentAt) ||
    row.assessmentSource === "manual";

  if (!hasAnyData && row.hardcoded) {
    return (
      <p className="text-xs text-gray-500 mt-1">
        Sin evaluación hoy — datos se cargan con el job 9:30:30 ET o al pulsar Evaluate.
      </p>
    );
  }

  return (
    <div className="space-y-2 mt-1">
      {assessed && row.excluded && excludeReason && (
        <p className="text-[10px] text-amber-900 font-medium bg-amber-50 border border-amber-200 rounded px-2 py-1">
          Verificado — excluido: {excludeReason}
          {eod?.priorDayBarCount != null && (
            <span className="block text-[9px] font-normal mt-0.5">
              Barras 15M sesión ayer: {eod.priorDayBarCount}/20 mín.
            </span>
          )}
        </p>
      )}
      {!assessed && excludeReason && (
        <p className="text-[10px] text-amber-800 font-medium">Excluido — {excludeReason}</p>
      )}
      <div className="flex flex-wrap gap-3 text-[10px] text-gray-600 items-center">
        {timing.status !== "pending" && (
          <DecisionTimingBadge timing={timing} />
        )}
        {pre?.gapPct != null && (
          <span>
            Gap {pre.gapPct > 0 ? "+" : ""}
            {pre.gapPct}%
          </span>
        )}
        {checks?.price != null && checks?.priorClose != null && (
          <span className="tabular-nums">
            Precio {checks.price} / ayer {checks.priorClose}
          </span>
        )}
        {eod?.priorVolScore != null && (
          <span>Vol ayer {eod.priorVolScore}</span>
        )}
      </div>
      <RulesBlock
        title={rulesPanel.label}
        score={score}
        rules={rulesPanel.items}
        row={row}
      />
      <PredictedDirectionBlock view={predictedDir} />
      {buySellEnabled ? <Mov15mExecutePanel row={row} /> : null}
      {!rulesPanel.pending && (
        <LastCheckPrediction view={prediction} />
      )}
      {summary && <p className="text-[10px] text-gray-600">{summary}</p>}
    </div>
  );
}

function tickerBadge(row: FinanceAiMov15mTicker): ReactNode {
  const collapsed = resolveBb15CollapsedTickerBadge(row);
  const rulesPanel = resolveBb15RulesPanel(row);
  const aboutToCross = rulesPanel.items.some((r) => r.aboutToCross === true);
  const predictedDir = resolveBb15PredictedDirection(row);
  const { checks } = resolveBb15TickerSignal(row);
  const closePrice = checks?.price;
  const timing = resolveBb15DecisionTiming(row);

  return (
    <TickerCollapsedSummaryBadge
      price={closePrice}
      directionArrow={<Bb15DirectionArrow direction={predictedDir.direction} />}
      timing={timing}
      checks={rulesPanel.items.map(bb15RuleToStrategyCheck)}
      checksPending={rulesPanel.pending}
      progress={collapsed}
      aboutToCross={aboutToCross}
      aboutToCrossTitle={
        rulesPanel.items.find((r) => r.aboutToCross)?.detail ??
        "Por cruzar BB mid (min 2–4 ET)"
      }
    />
  );
}

type Mov15mInsidePanelProps = {
  status?: FinanceAiMov15mStatus | null;
  loading?: boolean;
  windowActive?: boolean;
  hasSessionResults?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onRefresh?: () => void | Promise<void>;
  onStatusUpdate?: (status: FinanceAiMov15mStatus) => void;
  /** Full page layout — panels start expanded, each with chevron collapse. */
  standalone?: boolean;
  /** Inside Bolinger opening rules @ campana. */
  placement?: Bb15BollingerPlacement;
  /** Evaluate / See Latest controls per panel (Inside and Outside). */
  showHeaderActions?: boolean;
  /** Config → Tickers Movimiento 15M — when set, panels list all these symbols (split inside/outside only). */
  configWatchlist?: string[];
  panelId?: string;
};

const PLACEMENT_TITLE: Record<Bb15BollingerPlacement, string> = {
  inside: "Inside Bolinger",
  outside: "Outside Bolinger",
};

export function Mov15mInsidePanel({
  status: statusProp,
  loading: loadingProp,
  windowActive: windowActiveProp,
  hasSessionResults: hasSessionResultsProp,
  open: openProp,
  onOpenChange,
  onRefresh,
  onStatusUpdate,
  standalone = false,
  placement = "inside",
  showHeaderActions,
  configWatchlist,
  panelId,
}: Mov15mInsidePanelProps = {}) {
  const headerActions = showHeaderActions ?? placement === "inside";
  const embedded = statusProp !== undefined;
  const [openLocal, setOpenLocal] = useState(() => standalone);
  const open = openProp ?? openLocal;
  const setOpen = onOpenChange ?? setOpenLocal;

  const [triggeringNow, setTriggeringNow] = useState(false);
  const [loadingLatest, setLoadingLatest] = useState(false);
  const [lastEvalLabel, setLastEvalLabel] = useState<string | null>(null);
  const [windowActiveLocal, setWindowActiveLocal] = useState(() => isBolinger15FastWindowEt());
  const [loadingLocal, setLoadingLocal] = useState(false);
  const [statusLocal, setStatusLocal] = useState<FinanceAiMov15mStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nowProgress, setNowProgress] = useState<string | null>(null);

  const windowActive = windowActiveProp ?? windowActiveLocal;
  const status = embedded ? statusProp : statusLocal;
  const loading = embedded ? Boolean(loadingProp) : loadingLocal;
  const sessionResults = hasSessionResultsProp ?? hasBb15SessionResults(status);
  const buySellGlobal = status?.buySellEnabled === true;
  const buySellTickers = Array.isArray(status?.buySellTickers) ? status.buySellTickers : [];

  const isBuySellEnabledForSymbol = useCallback(
    (symbol: string) => {
      if (!buySellGlobal) return false;
      const sym = symbol.trim().toUpperCase();
      return buySellTickers.some((t) => t.toUpperCase() === sym);
    },
    [buySellGlobal, buySellTickers]
  );

  const configSymbols = useMemo(
    () =>
      [...new Set((configWatchlist ?? []).map((s) => s.trim().toUpperCase()).filter(Boolean))].sort(
        (a, b) => a.localeCompare(b)
      ),
    [configWatchlist]
  );

  const [pollingParams, setPollingParams] = useState(() =>
    defaultMov15mPollingParams(configSymbols)
  );
  const [pollingModalOpen, setPollingModalOpen] = useState(false);

  useEffect(() => {
    setPollingParams((prev) => ({
      ...prev,
      tickersForPolling:
        prev.tickersForPolling.length > 0 ? prev.tickersForPolling : configSymbols,
    }));
  }, [configSymbols]);

  /** GET status from MySQL snapshot (no AWS on page refresh). */
  const loadStatus = useCallback(async () => {
    setLoadingLocal(true);
    const result = await loadPersistedMov15mStatus();
    if (result.success && result.status) {
      setStatusLocal(result.status);
      setError(null);
    } else {
      setError(result.error ?? "Sin evaluación guardada — pulsa Evaluate o See Latest");
    }
    setLoadingLocal(false);
  }, []);

  const handleSeeLatest = useCallback(async () => {
    setLoadingLatest(true);
    setError(null);
    try {
      const result = await loadPersistedMov15mStatus();
      if (result.success && result.status) {
        onStatusUpdate?.(result.status);
        if (!embedded) setStatusLocal(result.status);
      } else {
        setError(result.error ?? "Sin evaluación guardada — pulsa Evaluate");
      }
    } finally {
      setLoadingLatest(false);
    }
  }, [embedded, onStatusUpdate]);

  const listSymbols = useMemo(() => {
    const poolSource = status?.watchlistSource === "tickersToday15M";
    if (poolSource && (status?.watchlist?.length ?? 0) > 0) {
      return status!.watchlist!;
    }
    if (configSymbols.length > 0) return configSymbols;
    if ((status?.watchlist?.length ?? 0) > 0) return status!.watchlist!;
    if (status?.tickers) return Object.keys(status.tickers);
    return [];
  }, [status, configSymbols]);

  const handleEvaluate = useCallback(async () => {
    const effectivePolling = pollingParams;
    const tickers =
      listSymbols.length > 0
        ? listSymbols
        : effectivePolling.tickersForPolling?.length
          ? effectivePolling.tickersForPolling
          : configSymbols;
    const checkOptions = {
      ...mov15mPollingToApiPayload({ ...effectivePolling, tickersForPolling: tickers }),
      mode: "full_assessment_inside_b15m" as const,
      manual: true,
    };
    setTriggeringNow(true);
    setError(null);
    setNowProgress(null);
    try {
      const result = await triggerFinanceAiMov15mCheck(checkOptions);
      const applied = await applyMov15mTriggerResult(
        result,
        (status) => {
          const pollLabel = effectivePolling.poll1mEnabled
            ? `${effectivePolling.pollingStartTimeEt}–${effectivePolling.pollingEndTimeEt} ET · ${tickers.length} tickers`
            : `sin 1m poll · ${tickers.length} tickers`;
          setLastEvalLabel(pollLabel);
          onStatusUpdate?.(status);
          if (!embedded) setStatusLocal(status);
        },
        async () => {
          if (onRefresh) await onRefresh();
          else if (!embedded) await loadStatus();
        },
        setNowProgress
      );
      if (!applied.ok) {
        setError(applied.error ?? "Error en Evaluate");
      } else {
        setNowProgress(null);
      }
    } finally {
      setTriggeringNow(false);
    }
  }, [configSymbols, embedded, listSymbols, loadStatus, onRefresh, onStatusUpdate, pollingParams]);

  useEffect(() => {
    if (embedded) return;
    const syncWindow = () => {
      setWindowActiveLocal(isBolinger15FastWindowEt());
    };
    syncWindow();
    const windowId = window.setInterval(syncWindow, WINDOW_CHECK_MS);
    return () => window.clearInterval(windowId);
  }, [embedded]);

  useEffect(() => {
    if (embedded) return;
    if (!open) return;

    void loadStatus();
  }, [embedded, open, loadStatus]);

  const displayTradeDate = status?.effectiveTradeDate ?? status?.tradeDate;

  const poolSource = status?.watchlistSource === "tickersToday15M";
  const symbols = listSymbols;
  const allRows: FinanceAiMov15mTicker[] = symbols.map((sym) => ({
    ...(status?.tickers?.[sym] ?? {}),
    symbol: sym,
    hardcoded: configSymbols.length === 0,
  }));
  const displayRows = allRows
    .filter(bb15TickerVisibleInList)
    .filter((row) => bb15TickerMatchesPlacement(row, placement));
  const resultCount = displayRows.length;
  const { met: metRows, notMet: notMetRows } = partitionBb15TickerRows(displayRows);

  const renderTickerRow = (row: FinanceAiMov15mTicker) => {
    const sym = row.symbol ?? "?";
    return (
      <TickerResultDetails key={sym} symbol={sym} badge={tickerBadge(row)}>
        <Bb15TickerBody row={row} buySellEnabled={isBuySellEnabledForSymbol(sym)} />
      </TickerResultDetails>
    );
  };

  const candidates = status?.candidates ?? [];
  const sessionDayActive = status?.sessionDayActive ?? isTradingSessionDayEt();

  const poolCount = status?.tickersToday15M?.symbols?.length ?? (poolSource ? symbols.length : 0);

  const premarketTop5 = (status as { premarketTop5?: { symbol?: string }[] } | null)?.premarketTop5;
  const premarketTop5Label =
    premarketTop5 && premarketTop5.length > 0
      ? `Top 5 premarket: ${premarketTop5.map((r) => r.symbol).filter(Boolean).join(", ")}`
      : null;

  const dynamicSubtitle = premarketTop5Label
    ? premarketTop5Label
    : lastEvalLabel
      ? `Evaluación ${lastEvalLabel} — reglas apertura inside @ campana`
      : poolSource
      ? `TickersToday15M — ${poolCount} ticker(s) con ≥50% checklist obligatorio · ${resultCount} en panel`
      : configSymbols.length > 0
      ? `${configSymbols.length} candidatos · ${resultCount} en panel · inside @ campana`
      : windowActive
        ? "En vivo — lectura de status guardado (job 9:30:30 ET o Evaluate)"
        : sessionResults
          ? displayTradeDate && !sessionDayActive
            ? `Última sesión ${displayTradeDate} — mercado cerrado hoy`
            : "Resultados del día — expande cada ticker"
          : !sessionDayActive
            ? "Mercado cerrado — Evaluate usa la última sesión (Schwab fresh)"
            : "Abre el panel para ver status · job 9:30:30 ET o Evaluate";

  const subtitle = dynamicSubtitle;

  return (
    <CollapsibleResultSection
      id={panelId ?? (placement === "inside" ? "journey-bb15-inside" : "journey-bb15-outside")}
      title={<>Movimientos -15M · {PLACEMENT_TITLE[placement]}</>}
      subtitle={subtitle}
      open={open}
      onOpenChange={setOpen}
      collapsible
      borderClass="border-violet-200"
      headerClass="bg-violet-50/50"
      bodyClassName="px-4 py-3 bg-slate-50/40"
      headerExtra={
        headerActions ? (
        <>
          <button
            type="button"
            className="text-[10px] px-2 py-1 rounded border border-sky-600 text-sky-800 bg-sky-50 disabled:opacity-50"
            onClick={() => void handleEvaluate()}
            disabled={triggeringNow || loadingLatest}
            title="Evaluate — evaluación mov15m (sin 1m polling por defecto)"
          >
            {triggeringNow ? "Evaluating…" : "Evaluate"}
          </button>
          <Mov15mPollingConfigButton
            onClick={() => setPollingModalOpen(true)}
            disabled={triggeringNow || loadingLatest || configSymbols.length === 0}
            variant="inside"
          />
          <button
            type="button"
            className="text-[10px] px-2 py-1 rounded border border-gray-400 text-gray-700 bg-white disabled:opacity-50"
            onClick={() => void handleSeeLatest()}
            disabled={triggeringNow || loadingLatest}
            title="See Latest — última evaluación guardada en MySQL (sin job AWS)"
          >
            {loadingLatest ? "Loading…" : "See Latest"}
          </button>
        </>
        ) : null
      }
    >
      {headerActions && configSymbols.length > 0 ? (
        <Mov15mEvaluateControls
          value={pollingParams}
          onChange={setPollingParams}
          disabled={triggeringNow || loadingLatest}
        />
      ) : null}
      <Mov15mPollingConfigModal
        open={pollingModalOpen}
        onClose={() => setPollingModalOpen(false)}
        configSymbols={configSymbols}
        value={pollingParams}
        onChange={setPollingParams}
        variant="inside"
      />
      {headerActions && loading && !status && (
        <p className="text-xs text-gray-500 mb-2">Leyendo status guardado…</p>
      )}
      {headerActions && nowProgress && (
        <p className="text-xs text-sky-800 bg-sky-50 border border-sky-200 rounded px-2 py-1.5 mb-2">
          {nowProgress}
        </p>
      )}
      {headerActions && error && <p className="text-xs text-red-600 mb-2">{error}</p>}
      {configSymbols.length > 0 && (
        <p className="text-[10px] text-gray-600 mb-2">
          Candidatos Movimiento 15M: {configSymbols.length}
          {resultCount > 0 ? (
            <span>
              {" "}
              · Mostrando {resultCount} ticker(s) (inside @ campana)
            </span>
          ) : null}
        </p>
      )}
      {headerActions && candidates.length > 0 && configSymbols.length === 0 && (
        <p className="text-[10px] text-amber-800 mb-2">
          Candidatos precheck: {candidates.join(", ")}
        </p>
      )}
      {!error && displayRows.length === 0 && !loading && !triggeringNow && !loadingLatest && (
        <p className="text-xs text-gray-500">
          {configSymbols.length === 0
            ? "Sin tickers Movimiento 15M — márcalos en Config → Tickers y guarda."
            : status?.lastRunAt
              ? `Sin resultados inside (${configSymbols.length} candidatos). Última evaluación ${status.lastRunAt}.`
              : `Sin resultados inside (${configSymbols.length} candidatos Movimiento 15M). Pulsa Evaluate.`}
        </p>
      )}
      {!error && displayRows.length > 0 && (
        <div className="space-y-3">
          {metRows.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold text-green-800 border-b border-green-100 pb-0.5">
                Estrategia cumplida ({metRows.length})
              </p>
              {metRows.map(renderTickerRow)}
            </div>
          )}
          {notMetRows.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold text-gray-600 border-b border-gray-200 pb-0.5">
                No cumple ({notMetRows.length})
              </p>
              {notMetRows.map(renderTickerRow)}
            </div>
          )}
        </div>
      )}
    </CollapsibleResultSection>
  );
}
