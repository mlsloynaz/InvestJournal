"use client";

import { useEffect, useState } from "react";
import type {
  FinanceAiGapBollingerOutlook,
  FinanceAiMonthCalendar,
  FinanceAiNewsSentiment,
  FinanceAiPostmarketAnalysis,
  FinanceAiPremarketAnalysis,
  FinanceAiSessionGap,
  FinanceAiStrategyFit,
} from "@/lib/finance-ai-types";
import {
  formatUpcomingEarnings,
  formatUpcomingFomc,
} from "@/lib/calendar-display";
import { formatFinanceAiTimestamp } from "@/lib/format-datetime";
import { tradingDateEt } from "@/lib/live-session-window";
import { MarketAiFoundationTrends } from "@/components/gestion/MarketAiFoundationTrends";
import { ResultNowBriefStrip } from "@/components/gestion/ResultNowBriefStrip";
import { StrategyRequirementsListFromFit } from "@/components/gestion/StrategyRequirementsList";
import { StrategyMetDirectionArrow } from "@/components/gestion/StrategyMetDirectionArrow";
import {
  filterStrategyFits,
  firstDisqualifyReason,
  fitProbabilityLabel,
  formatStrategyIdLabel,
  isStrategyQualified,
  isStrategyFullyMet,
  gapBollingerPrimaryLabel,
  gapBollingerStrengthLabel,
  gapBollingerTimeframeLines,
  sessionGapContextLines,
  sortStrategiesByPriority,
  strategyChecklistProgress,
  strategyDataAsOf,
  strategyEntryDirection,
  strategyEvalContextFromChecklist,
  strategyExpectedTiming,
  strategyActionNotes,
  strategyTitle,
  normalizeStrategyFitForDisplay,
  type StrategyEvalContext,
} from "@/lib/strategy-display";
import {
  type LatestStrategiesEval,
  type PremarketUpdatedView,
} from "@/lib/premarket-display";
function postmarketVerdictLabel(verdict?: string): string {
  switch (verdict) {
    case "achieved":
      return "Lograda";
    case "partial":
      return "Parcial";
    case "missed":
      return "No lograda";
    case "not_applicable":
      return "N/A";
    default:
      return verdict ?? "—";
  }
}

function postmarketVerdictClass(verdict?: string): string {
  switch (verdict) {
    case "achieved":
      return "text-green-800";
    case "partial":
      return "text-amber-800";
    case "missed":
      return "text-red-800";
    default:
      return "text-gray-700";
  }
}

function StrategySessionLines({
  sessionGap,
  className = "text-gray-600",
}: {
  sessionGap?: FinanceAiSessionGap | null;
  className?: string;
}) {
  const lines = sessionGapContextLines(sessionGap);
  if (lines.length === 0) return null;
  return (
    <div className={`mt-0.5 space-y-0.5 ${className}`}>
      {lines.map((line) => (
        <p key={line.key} title={line.title}>
          {line.text}
        </p>
      ))}
    </div>
  );
}

function StrategyChecklistProgressBar({ strategy }: { strategy: FinanceAiStrategyFit }) {
  const normalized = normalizeStrategyFitForDisplay(strategy);
  const { met, partial, total, metPct, weightedPct } = strategyChecklistProgress(normalized);
  if (total === 0 && weightedPct === 0 && (normalized.fit ?? "none") === "none") return null;

  const partialPct = total > 0 ? Math.round((partial / total) * 100) : 0;
  const greenPct = total > 0 ? metPct : weightedPct;
  const metLabel = total > 0 ? `${met}/${total}${partial > 0 ? ` (+${partial}~)` : ""}` : null;

  return (
    <div
      className="flex items-center gap-2 w-full min-w-0 py-0.5"
      title={
        metLabel
          ? `${met} cumplidos · ${partial} parcial · ${total} requisitos · ${weightedPct}%`
          : `${weightedPct}% probabilidad`
      }
    >
      <div className="relative flex-1 h-2.5 bg-orange-200 rounded-full overflow-hidden min-w-[5rem]">
        <div
          className="absolute inset-y-0 left-0 bg-green-600 rounded-l-full transition-[width] duration-300"
          style={{ width: `${Math.min(100, Math.max(0, greenPct))}%` }}
        />
        {partial > 0 && total > 0 && (
          <div
            className="absolute inset-y-0 bg-amber-400 transition-[width] duration-300"
            style={{ left: `${greenPct}%`, width: `${partialPct}%` }}
          />
        )}
      </div>
      {metLabel && (
        <span className="text-[10px] text-gray-600 tabular-nums shrink-0 font-medium">{metLabel}</span>
      )}
      <span className="text-[10px] text-gray-700 tabular-nums shrink-0 font-semibold">{weightedPct}%</span>
    </div>
  );
}

function StrategyActionNotesList({ strategy }: { strategy: FinanceAiStrategyFit }) {
  const notes = strategyActionNotes(strategy);
  if (notes.length === 0) return null;
  return (
    <ul className="mt-1.5 space-y-1">
      {notes.map((item, index) => (
        <li
          key={`${item.requirementId ?? item.ruleKey ?? "action"}-${index}`}
          className="flex gap-1.5 text-indigo-900"
        >
          <span className="shrink-0 font-medium" aria-hidden>
            →
          </span>
          <span className="min-w-0">
            <span className="font-medium">{item.label?.trim() || "Acción"}</span>
            {item.evidence && (
              <span className="block text-[10px] text-indigo-800/90 font-normal mt-0.5">
                {item.evidence}
              </span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}

function StrategyDetailBody({
  strategy,
  sessionGap,
  evalContext,
  qualified,
}: {
  strategy: FinanceAiStrategyFit;
  sessionGap?: FinanceAiSessionGap | null;
  evalContext?: StrategyEvalContext;
  qualified: boolean;
}) {
  const dataAsOf = strategyDataAsOf(evalContext ?? {});
  const expectedWhen = strategyExpectedTiming(strategy, evalContext?.phase);
  const entryDir = strategyEntryDirection(strategy);

  return (
    <>
      <p className="text-teal-900 mt-0.5">Cuándo: {expectedWhen}</p>
      {dataAsOf && <p className="text-gray-500 mt-0.5">Datos hasta: {dataAsOf}</p>}
      <StrategyRequirementsListFromFit strategy={strategy} className="mt-1.5" groupMet />
      <StrategyActionNotesList strategy={strategy} />
      {entryDir && (
        <p className={`mt-1.5 font-semibold ${qualified ? "text-green-900" : "text-gray-800"}`}>
          Entry: {entryDir}
        </p>
      )}
      {!qualified && sessionGap && <StrategySessionLines sessionGap={sessionGap} className="text-gray-600" />}
    </>
  );
}

function StrategyRow({
  strategy,
  sessionGap,
  evalContext,
  rank,
  showMetDirectionArrows = false,
}: {
  strategy: FinanceAiStrategyFit;
  sessionGap?: FinanceAiSessionGap | null;
  evalContext?: StrategyEvalContext;
  rank?: number;
  showMetDirectionArrows?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const fit = strategy.fit ?? "none";
  const qualified = isStrategyQualified(strategy);
  const fullyMet = showMetDirectionArrows && isStrategyFullyMet(strategy);
  const title = strategyTitle(strategy);
  const entryDir = strategyEntryDirection(strategy);
  const expectedWhen = strategyExpectedTiming(strategy, evalContext?.phase);
  const rankPrefix = rank != null ? `#${rank} · ` : "";
  const metArrow = fullyMet ? (
    <StrategyMetDirectionArrow direction={entryDir ?? strategy.direction} className="mt-0.5" />
  ) : null;

  if (!qualified) {
    if (!open) {
      return (
        <div className="border border-red-100 rounded px-2 py-1 bg-white/70 text-xs space-y-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-red-800 min-w-0">
              {rankPrefix}✗ {title} — {firstDisqualifyReason(strategy)}
            </p>
            <button
              type="button"
              className="text-red-800 underline shrink-0"
              onClick={() => setOpen(true)}
            >
              Detalle
            </button>
          </div>
          <StrategyChecklistProgressBar strategy={strategy} />
        </div>
      );
    }

    return (
      <div className="border border-red-100 rounded p-2 bg-white/70 text-xs space-y-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-red-800">
            {rankPrefix}✗ {title} — {firstDisqualifyReason(strategy)}
          </p>
          <button type="button" className="text-red-800 underline shrink-0" onClick={() => setOpen(false)}>
            Ocultar
          </button>
        </div>
        <StrategyChecklistProgressBar strategy={strategy} />
        <StrategyDetailBody
          strategy={strategy}
          sessionGap={sessionGap}
          evalContext={evalContext}
          qualified={false}
        />
      </div>
    );
  }

  if (!open) {
    return (
      <div className="border border-green-200 rounded px-2 py-1.5 bg-green-50/60 text-xs space-y-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-1.5 min-w-0">
            {metArrow}
            <p className="text-green-900 min-w-0">
              {rankPrefix}✓ {title}
              {entryDir ? ` · Entry ${entryDir}` : ""} · {fitProbabilityLabel(fit)} · {expectedWhen}
            </p>
          </div>
          <button
            type="button"
            className="text-green-800 underline shrink-0"
            onClick={() => setOpen(true)}
          >
            Detalle
          </button>
        </div>
        <StrategyChecklistProgressBar strategy={strategy} />
      </div>
    );
  }

  return (
    <div className="border border-green-200 rounded p-2 bg-green-50/60 text-xs space-y-1">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-1.5 min-w-0">
          {metArrow}
          <p className="text-green-900 font-medium min-w-0">
            {rankPrefix}✓ {title}
            {entryDir ? ` · Entry ${entryDir}` : ""} · {fitProbabilityLabel(fit)}
          </p>
        </div>
        <button type="button" className="text-green-800 underline shrink-0" onClick={() => setOpen(false)}>
          Ocultar
        </button>
      </div>
      <StrategyChecklistProgressBar strategy={strategy} />
      <StrategyDetailBody
        strategy={strategy}
        sessionGap={sessionGap}
        evalContext={evalContext}
        qualified
      />
    </div>
  );
}

export function StrategyChecklistBlock({
  strategies,
  sessionGap,
  evalContext,
  showMetDirectionArrows = false,
  symbol,
  strategyIdsFilter,
}: {
  strategies: FinanceAiStrategyFit[];
  sessionGap?: FinanceAiSessionGap | null;
  evalContext?: StrategyEvalContext;
  showMetDirectionArrows?: boolean;
  symbol?: string;
  strategyIdsFilter?: readonly string[];
}) {
  const list = sortStrategiesByPriority(
    filterStrategyFits(strategies.map(normalizeStrategyFitForDisplay), strategyIdsFilter)
  );
  const qualified = list.filter((s) => isStrategyQualified(s));
  const disqualified = list.filter((s) => !isStrategyQualified(s));
  const tickerLabel = symbol?.trim() || "—";

  const summaryLabel =
    qualified.length > 0
      ? `Estrategias (${tickerLabel}) · ✓ ${qualified.length} con fit hoy`
      : `Estrategias (${tickerLabel})`;

  return (
    <details open className="mt-2 text-xs">
      <summary className="cursor-pointer select-none font-medium text-investep-navy">
        {summaryLabel}
      </summary>
      <div className="mt-2 space-y-2 pl-0.5">
        {qualified.map((s, index) => (
          <StrategyRow
            key={`ok-${s.strategyId}-${s.variantId ?? "base"}`}
            strategy={s}
            sessionGap={sessionGap}
            evalContext={evalContext}
            rank={index + 1}
            showMetDirectionArrows={showMetDirectionArrows}
          />
        ))}
        {disqualified.length > 0 && (
          <details className="text-gray-600 pt-1">
            <summary className="cursor-pointer select-none">
              Sin fit hoy ({disqualified.length}) — referencia
            </summary>
            <div className="mt-2 space-y-1">
              {disqualified.map((s, index) => (
                <StrategyRow
                  key={`no-${s.strategyId}-${s.variantId ?? "base"}`}
                  strategy={s}
                  sessionGap={sessionGap}
                  evalContext={evalContext}
                  rank={qualified.length + index + 1}
                />
              ))}
            </div>
          </details>
        )}
      </div>
    </details>
  );
}

function TradingCalendarBlock({
  gate,
  monthCal,
}: {
  gate: NonNullable<FinanceAiPremarketAnalysis["calendarGate"]>;
  monthCal?: FinanceAiMonthCalendar | null;
  bedrockSkipped?: boolean;
}) {
  const [todayEt, setTodayEt] = useState<string | null>(null);
  useEffect(() => {
    setTodayEt(tradingDateEt());
  }, []);

  const refDate = gate.tradeDate ?? todayEt ?? "";
  const blockedToday = (gate.checklist ?? []).filter((item) => item.status === "blocked");
  const fomcText = refDate ? formatUpcomingFomc(monthCal, refDate) : null;
  const earningsText = refDate ? formatUpcomingEarnings(monthCal, refDate, todayEt) : null;

  const shellClass = gate.doNotTrade
    ? "border-red-200 bg-red-50"
    : "border-green-200 bg-green-50/80";
  const titleClass = gate.doNotTrade ? "text-red-800" : "text-green-800";

  return (
    <div className={`mt-2 border rounded p-2 space-y-1 ${shellClass}`}>
      <p className={`font-medium ${titleClass}`}>
        FOMC and Earnings: {gate.doNotTrade ? "NO OPERAR hoy" : "OK"}
      </p>

      {gate.doNotTrade && (
        <>
          <ul className="space-y-0.5 list-none">
            {blockedToday.map((item) => (
              <li key={item.id ?? item.label} className="text-red-800 font-semibold">
                ✗ {item.label}
                {item.evidence && <span className="font-normal"> — {item.evidence}</span>}
              </li>
            ))}
          </ul>
          {(gate.doNotTradeReasons?.length ?? 0) > 0 && (
            <p className="text-red-900">{gate.doNotTradeReasons!.join(" ")}</p>
          )}
        </>
      )}

      {fomcText && (
        <p className="text-gray-700">
          <span className="font-medium">FOMC:</span> {fomcText}
        </p>
      )}
      {earningsText && (
        <p className="text-gray-700">
          <span className="font-medium">Earnings:</span> {earningsText}
        </p>
      )}
    </div>
  );
}

function GapBollingerOutlookBlock({
  outlook,
  title,
}: {
  outlook?: FinanceAiGapBollingerOutlook | null;
  title?: string;
}) {
  if (!outlook?.available) return null;
  const primary = gapBollingerPrimaryLabel(outlook);
  const strength = gapBollingerStrengthLabel(outlook);
  const tfLines = gapBollingerTimeframeLines(outlook);
  if (!primary && tfLines.length === 0) return null;
  return (
    <div className="mt-2 border border-violet-200 bg-violet-50/70 rounded p-2 space-y-1">
      <p className="font-medium text-violet-900">
        {title ?? (outlook.priceKind === "real" ? "Gap vs Bollinger (apertura)" : "Gap vs Bollinger (pre-apertura)")}
      </p>
      {primary && <p className="text-violet-950">{primary}</p>}
      {strength && (
        <p
          className={
            outlook.strength === "strong"
              ? "text-green-800 font-medium"
              : outlook.strength === "moderate"
                ? "text-amber-800"
                : "text-gray-600"
          }
        >
          {strength}
        </p>
      )}
      {tfLines.length > 0 && (
        <ul className="list-disc pl-4 space-y-0.5 text-gray-700">
          {tfLines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function NewsSentimentBlock({
  news,
  defaultCollapsed = true,
  onRefresh,
  refreshPending,
}: {
  news: FinanceAiNewsSentiment;
  defaultCollapsed?: boolean;
  onRefresh?: () => void;
  refreshPending?: boolean;
}) {
  const [expanded, setExpanded] = useState(!defaultCollapsed);
  if (!news) return null;
  const headlines = news.headlines ?? news.items?.slice(0, 5).map((i) => ({
    title: i.title,
    published: i.published,
    sentiment_label: i.sentiment_label,
    sentiment_score: i.sentiment_score,
  }));
  const score = news.averageScore ?? 0;
  const scoreClass =
    score > 0.1
      ? "text-green-800 font-semibold"
      : score < -0.1
        ? "text-red-800 font-semibold"
        : "text-gray-700";

  const summaryLine = news.skipped
    ? `Omitido: ${news.skipReason ?? "sin datos"}`
    : `${news.count ?? 0} artículos · score ${score}`;

  return (
    <div className="mt-2 border border-violet-200 bg-violet-50/70 rounded text-xs">
      <button
        type="button"
        className="w-full flex items-start justify-between gap-2 p-2 text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="font-medium text-violet-900 min-w-0">
          News / sentimiento (Alpha Vantage)
          {!expanded && (
            <span className="font-normal text-gray-700">
              {" "}
              · {summaryLine}
            </span>
          )}
          {expanded && news.freshForToday === false && (
            <span className="text-amber-800 font-normal"> · no actualizado hoy</span>
          )}
          {expanded && news.freshForToday && news.fetchedAt && (
            <span className="text-gray-600 font-normal">
              {" "}
              · {formatFinanceAiTimestamp(news.fetchedAt)}
              {news.source === "scheduled_920" || news.source === "scheduled_845"
                ? " (9:20 ET)"
                : news.source === "adhoc"
                  ? " (manual)"
                  : ""}
            </span>
          )}
        </span>
        <span className="text-violet-700 shrink-0">{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && (
        <div className="px-2 pb-2 space-y-1 border-t border-violet-200/80">
          {news.skipped ? (
            <p className="text-gray-600 pt-1">{news.skipReason ?? "sin elegibilidad"}</p>
          ) : (
            <>
              <p className="text-violet-900 pt-1">
                {news.count ?? 0} artículos · score medio{" "}
                <span className={scoreClass}>{score}</span>
              </p>
              <p className="text-gray-500">
                El score es por ticker; titulares macro se repiten entre símbolos.
              </p>
              {(headlines?.length ?? 0) > 0 && (
                <ul className="space-y-1 list-none text-gray-700">
                  {headlines!.slice(0, 5).map((h, i) => (
                    <li key={`${h.title}-${i}`}>
                      <span
                        className={
                          h.sentiment_label === "Bullish"
                            ? "text-green-800"
                            : h.sentiment_label === "Bearish"
                              ? "text-red-800"
                              : "text-gray-600"
                        }
                      >
                        {h.sentiment_label ?? "—"}
                        {h.sentiment_score != null && ` (${h.sentiment_score})`}
                      </span>
                      {" · "}
                      {h.title ?? "—"}
                    </li>
                  ))}
                </ul>
              )}
              {!news.skipped && (news.count ?? 0) === 0 && (
                <p className="text-gray-600">
                  Sin artículos hoy — prefetch 9:20 ET (watchlist) o actualizar abajo.
                </p>
              )}
            </>
          )}
          {onRefresh && (
            <button
              type="button"
              className="text-violet-800 underline disabled:opacity-50"
              disabled={refreshPending}
              onClick={(e) => {
                e.stopPropagation();
                onRefresh();
              }}
            >
              Actualizar desde AV (este ticker)
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function CalendarGateBlock({
  gate,
  monthCal,
  bedrockSkipped,
}: {
  gate: NonNullable<FinanceAiPremarketAnalysis["calendarGate"]>;
  monthCal?: FinanceAiMonthCalendar | null;
  bedrockSkipped?: boolean;
}) {
  return (
    <TradingCalendarBlock gate={gate} monthCal={monthCal} bedrockSkipped={bedrockSkipped} />
  );
}

function BedrockCandidatesBlock({
  candidates,
  sessionGap,
}: {
  candidates: NonNullable<FinanceAiPremarketAnalysis["strategyCandidates"]>;
  sessionGap?: FinanceAiSessionGap | null;
}) {
  const [open, setOpen] = useState(false);
  const qualified = candidates.filter((s) => (s.fit ?? "none") !== "none");
  if (qualified.length === 0) return null;
  const top = qualified[0];
  return (
    <div className="border border-blue-200 rounded p-2 bg-white/70 text-xs">
      <p className="text-investep-navy">
        Bedrock: ✓ {formatStrategyIdLabel(top.id)} · {top.direction ?? "—"} ·{" "}
        {fitProbabilityLabel(top.fit)}
      </p>
      <StrategySessionLines sessionGap={sessionGap} className="text-gray-700" />
      <button
        type="button"
        className="text-blue-800 underline mt-0.5"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "Ocultar candidatos" : "Ver candidatos Bedrock"}
      </button>
      {open && (
        <div className="mt-1 space-y-1 border-t border-blue-100 pt-1">
          {qualified.map((s) => (
            <div key={s.id ?? s.notes} className="pl-1 border-l-2 border-blue-200">
              <p>
                {formatStrategyIdLabel(s.id)} · {s.direction ?? "—"} ·{" "}
                {fitProbabilityLabel(s.fit)}
                {s.profitProfile && s.profitProfile !== "none" && ` · ${s.profitProfile}`}
              </p>
              {s.noton && <p className="font-bold text-red-700">{s.noton}</p>}
              {(s.waitForConfirmation?.length ?? 0) > 0 && (
                <p className="text-gray-600">
                  Cuándo: {s.waitForConfirmation!.join("; ")}
                </p>
              )}
              <StrategySessionLines sessionGap={sessionGap} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function PremarketUpdatedSummary({
  view,
  symbol,
  strategyIdsFilter,
  showMetDirectionArrows = false,
}: {
  view: PremarketUpdatedView;
  symbol?: string;
  strategyIdsFilter?: readonly string[];
  showMetDirectionArrows?: boolean;
}) {
  const tickerLabel = (symbol ?? view.symbol)?.trim() || "—";
  const ref = view.baselineRef;

  if (!view.hasLiveUpdate) {
    return (
      <div className="mt-2 text-xs text-gray-700 bg-amber-50/80 border border-amber-200 rounded p-2 space-y-1">
        <p>
          <span className="font-medium text-amber-950">Pre-market actualizado:</span> pendiente
        </p>
        {view.waitNote && <p className="text-amber-900">{view.waitNote}</p>}
        {ref && (
          <details className="text-gray-600">
            <summary className="cursor-pointer select-none text-[11px]">
              Referencia PRE guardado ({ref.dataCutoffEt ?? "09:29 ET"})
            </summary>
            <p className="mt-1 pl-0.5">
              {ref.bias ?? "—"}
              {ref.revision != null && ` · rev ${ref.revision}`}
              {ref.updatedAt && ` · ${formatFinanceAiTimestamp(ref.updatedAt)}`}
            </p>
          </details>
        )}
        {view.contextForBrief && (
          <ResultNowBriefStrip
            analysis={view.contextForBrief}
            strategyIdsFilter={strategyIdsFilter}
          />
        )}
      </div>
    );
  }

  const merged = view.merged;
  const live = view.live;
  const strategies = filterStrategyFits(live?.strategyChecklist?.strategies, strategyIdsFilter);
  const hasStrategies = strategies.length > 0;

  return (
    <div className="mt-2 text-xs text-gray-700 bg-violet-50 border border-violet-200 rounded p-2 space-y-1">
      <p>
        <span className="font-medium text-violet-950">Pre-market actualizado:</span>{" "}
        {merged?.bias ?? live?.strategyChecklist ? "checklist en vivo" : "—"}
        {view.updatedAt && ` · ${formatFinanceAiTimestamp(view.updatedAt)}`}
        {live?.revision != null && ` · rev ${live.revision}`}
      </p>
      {view.proximityNote && (
        <p className="text-violet-900 font-medium">{view.proximityNote}</p>
      )}
      {live?.delta && (
        <p className="text-gray-600">
          Cambios vs snapshot PRE:{" "}
          {(() => {
            const d = live.delta as {
              biasChanged?: boolean;
              newQualifiedStrategies?: unknown[];
              lostQualifiedStrategies?: unknown[];
            };
            const newN = Array.isArray(d.newQualifiedStrategies)
              ? d.newQualifiedStrategies.length
              : 0;
            const lostN = Array.isArray(d.lostQualifiedStrategies)
              ? d.lostQualifiedStrategies.length
              : 0;
            return (
              [
                d.biasChanged && "sesgo",
                newN > 0 ? `+${newN} calificadas` : null,
                lostN > 0 ? `-${lostN} calificadas` : null,
              ]
                .filter(Boolean)
                .join(" · ") || "sin cambios en calificadas"
            );
          })()}
        </p>
      )}
      {ref && (
        <details className="text-gray-500">
          <summary className="cursor-pointer select-none text-[11px]">
            Referencia PRE guardado ({ref.dataCutoffEt ?? "09:29 ET"})
          </summary>
          <p className="mt-1 pl-0.5">
            {ref.bias ?? "—"}
            {ref.revision != null && ` · rev ${ref.revision}`}
            {ref.updatedAt && ` · ${formatFinanceAiTimestamp(ref.updatedAt)}`}
          </p>
        </details>
      )}
      {view.contextForBrief && (
        <ResultNowBriefStrip
          analysis={view.contextForBrief}
          strategyIdsFilter={strategyIdsFilter}
        />
      )}
      {hasStrategies && live ? (
        <div className="border border-violet-300/60 bg-white/60 rounded p-2 space-y-1">
          <p className="font-medium text-violet-950">Evaluación estrategias ({tickerLabel})</p>
          <p className="text-[10px] text-violet-800/90">
            Datos en vivo — puede estar más cerca o más lejos que el PRE de las 09:29 ET.
          </p>
          <StrategyChecklistBlock
            strategies={strategies}
            sessionGap={merged?.sessionGap ?? live.sessionGap ?? live.strategyChecklist?.sessionGap}
            evalContext={strategyEvalContextFromChecklist(live.strategyChecklist, {
              evaluatedAt: view.updatedAt,
              tradeDate: live.date,
              phase: "NOW",
            })}
            symbol={tickerLabel !== "—" ? tickerLabel : undefined}
            strategyIdsFilter={strategyIdsFilter}
            showMetDirectionArrows={showMetDirectionArrows}
          />
        </div>
      ) : (
        <p className="text-gray-600 italic">Sin checklist actualizado en AWS.</p>
      )}
    </div>
  );
}

export function PremarketBaselineSummary({
  analysis,
  symbol,
  strategyIdsFilter,
  showMetDirectionArrows,
}: {
  analysis: FinanceAiPremarketAnalysis;
  symbol?: string;
  strategyIdsFilter?: readonly string[];
  showMetDirectionArrows?: boolean;
}) {
  const calendarGate = analysis.calendarGate ?? analysis.strategyChecklist?.calendarGate;
  const strategies = filterStrategyFits(analysis.strategyChecklist?.strategies, strategyIdsFilter);
  const hasStrategies = strategies.length > 0;
  const tickerLabel = (symbol ?? analysis.symbol)?.trim() || "—";
  const phase = analysis.assessmentPhase === "NOW" ? "NOW" : "PRE";
  const headerLabel = phase === "NOW" ? "Evaluación en vivo" : "Pre-market (guardado)";
  const strategyPhaseHint =
    phase === "NOW"
      ? "NOW: criterios con barras actuales hasta el corte indicado."
      : "PRE: solo criterios con velas hasta 9:29 ET. Tras apertura → Result Now o Postmarket.";
  const metArrows = showMetDirectionArrows ?? phase === "NOW";
  return (
    <div className="mt-2 text-xs text-gray-700 bg-blue-50 border border-blue-100 rounded p-2 space-y-1">
      <p>
        <span className="font-medium">{headerLabel}:</span> {analysis.bias ?? "—"}
        {analysis.revision != null && ` · rev ${analysis.revision}`}
        {analysis.updatedAt && ` · ${formatFinanceAiTimestamp(analysis.updatedAt)}`}
        {analysis.dataCutoffEt && (
          <span className="text-gray-600"> · datos hasta {analysis.dataCutoffEt}</span>
        )}
        {analysis.simulationTimeEt && (
          <span className="text-gray-600"> · sim {analysis.simulationTimeEt} ET</span>
        )}
      </p>
      {calendarGate && (
        <CalendarGateBlock
          gate={calendarGate}
          monthCal={analysis.marketCalendar?.monthCalendar}
          bedrockSkipped
        />
      )}
      {analysis.newsSentiment && (
        <NewsSentimentBlock news={analysis.newsSentiment} defaultCollapsed />
      )}
      {"preDisplayNote" in analysis && analysis.preDisplayNote && (
        <p className="text-amber-800">{analysis.preDisplayNote}</p>
      )}
      <GapBollingerOutlookBlock outlook={analysis.sessionGap?.gapBollinger} />
      {(analysis.marketFoundation || analysis.strategyChecklist?.trends || analysis.panoramaCompleto || analysis.strategyChecklist?.panoramaCompleto) && (
        <MarketAiFoundationTrends
          foundation={analysis.marketFoundation}
          trendsFromChecklist={analysis.strategyChecklist?.trends as never}
          panorama={
            analysis.panoramaCompleto ??
            analysis.marketFoundation?.panoramaCompleto ??
            analysis.strategyChecklist?.panoramaCompleto
          }
        />
      )}
      {hasStrategies ? (
        <div className="border border-emerald-200 bg-emerald-50/60 rounded p-2 space-y-1">
          <p className="font-medium text-emerald-900">Evaluación estrategias ({tickerLabel})</p>
          <p className="text-[10px] text-emerald-800/90">{strategyPhaseHint}</p>
          <StrategyChecklistBlock
            strategies={strategies}
            sessionGap={analysis.sessionGap ?? analysis.strategyChecklist?.sessionGap}
            evalContext={strategyEvalContextFromChecklist(analysis.strategyChecklist, {
              evaluatedAt: analysis.updatedAt,
              tradeDate: analysis.date,
              phase,
              dataCutoffEt: analysis.dataCutoffEt ?? (phase === "PRE" ? "09:29 ET" : undefined),
            })}
            showMetDirectionArrows={metArrows}
            symbol={tickerLabel !== "—" ? tickerLabel : undefined}
            strategyIdsFilter={strategyIdsFilter}
          />
        </div>
      ) : (
        <p className="text-gray-600 italic">
          Sin checklist de estrategias — ejecuta PRE de nuevo para regenerar evaluación.
        </p>
      )}
      {analysis.doNotTrade && (
        <p className="text-red-700">
          No operar: {(analysis.doNotTradeReasons ?? []).join("; ") || "ver análisis"}
        </p>
      )}
    </div>
  );
}

export function LatestStrategiesPanel({
  latest,
  evalContext,
  showMetDirectionArrows = false,
  strategyIdsFilter,
}: {
  latest: LatestStrategiesEval;
  evalContext?: StrategyEvalContext;
  showMetDirectionArrows?: boolean;
  strategyIdsFilter?: readonly string[];
}) {
  const strategies = filterStrategyFits(latest.strategyChecklist?.strategies, strategyIdsFilter);
  const hasStrategies = strategies.length > 0;
  const tickerLabel = latest.symbol?.trim() || "—";
  return (
    <div className="mt-2 text-xs text-gray-700 bg-emerald-50 border border-emerald-200 rounded p-2 space-y-1">
      <p className="font-medium text-emerald-900">
        Evaluación estrategias ({tickerLabel})
        {latest.updatedAt && ` · ${formatFinanceAiTimestamp(latest.updatedAt)}`}
        {latest.revision != null && ` · rev ${latest.revision}`}
      </p>
      {latest.delta && (
        <p className="text-gray-600">
          Cambios vs pre-market:{" "}
          {(() => {
            const d = latest.delta as {
              biasChanged?: boolean;
              newQualifiedStrategies?: unknown[];
              lostQualifiedStrategies?: unknown[];
            };
            const newN = Array.isArray(d.newQualifiedStrategies)
              ? d.newQualifiedStrategies.length
              : 0;
            const lostN = Array.isArray(d.lostQualifiedStrategies)
              ? d.lostQualifiedStrategies.length
              : 0;
            return (
              [
                d.biasChanged && "sesgo",
                newN > 0 ? `+${newN} calificadas` : null,
                lostN > 0 ? `-${lostN} calificadas` : null,
              ]
                .filter(Boolean)
                .join(" · ") || "sin cambios relevantes"
            );
          })()}
        </p>
      )}
      {(latest.marketFoundation || latest.strategyChecklist?.trends || latest.panoramaCompleto) && (
        <MarketAiFoundationTrends
          foundation={latest.marketFoundation}
          trendsFromChecklist={latest.strategyChecklist?.trends as never}
          panorama={
            latest.panoramaCompleto ??
            latest.marketFoundation?.panoramaCompleto ??
            latest.strategyChecklist?.panoramaCompleto
          }
        />
      )}
      {hasStrategies && (
        <StrategyChecklistBlock
          strategies={strategies}
          sessionGap={latest.sessionGap ?? latest.strategyChecklist?.sessionGap}
          evalContext={strategyEvalContextFromChecklist(latest.strategyChecklist, {
            ...evalContext,
            evaluatedAt: evalContext?.evaluatedAt ?? latest.updatedAt,
            tradeDate: evalContext?.tradeDate ?? latest.date,
          })}
          showMetDirectionArrows={showMetDirectionArrows}
          symbol={tickerLabel !== "—" ? tickerLabel : undefined}
          strategyIdsFilter={strategyIdsFilter}
        />
      )}
      {!hasStrategies && (
        <p className="text-gray-600">Sin checklist de estrategias en esta evaluación.</p>
      )}
    </div>
  );
}

export function PostmarketSummary({
  analysis,
  sessionGap,
}: {
  analysis: FinanceAiPostmarketAnalysis;
  sessionGap?: FinanceAiSessionGap | null;
}) {
  const report = analysis.report;
  const outcomes = analysis.outcomes;
  const eff = analysis.effectivenessSnapshot;
  const extendedSession = sessionGap ?? analysis.sessionGap;
  const gapBbOutlook =
    analysis.sessionGap?.gapBollinger ??
    extendedSession?.gapBollinger ??
    null;
  const session = outcomes?.sessionStats as
    | { changePct?: number; direction?: string; open?: number; close?: number }
    | undefined;

  return (
    <div className="mt-2 text-xs text-gray-700 bg-amber-50 border border-amber-200 rounded p-2 space-y-2">
      <p>
        <span className="font-medium text-amber-900">Post-market:</span>{" "}
        <span className={postmarketVerdictClass(report?.primaryVerdict)}>
          {postmarketVerdictLabel(report?.primaryVerdict)}
        </span>
        {analysis.updatedAt && ` · ${formatFinanceAiTimestamp(analysis.updatedAt)}`}
        {analysis.source && ` · ${analysis.source}`}
      </p>
      {outcomes && (
        <p className="text-gray-700">
          Plan{" "}
          {formatStrategyIdLabel(outcomes.primaryStrategyId)} · {outcomes.primaryDirection ?? "—"} ·{" "}
          {outcomes.primaryAchieved ? "✓ cumplida" : "✗ no cumplida"}
          {outcomes.achievementPct != null && (
            <span>
              {" "}
              · {outcomes.achievedCount}/{outcomes.qualifiedCount} estrategias (
              {outcomes.achievementPct}%)
            </span>
          )}
          {session?.changePct != null && (
            <span>
              {" "}
              · día {session.changePct}% ({session.direction ?? outcomes.actualDayDirection})
            </span>
          )}
        </p>
      )}
      {gapBbOutlook && <GapBollingerOutlookBlock outlook={gapBbOutlook} />}
      {analysis.panoramaDiff?.available && (analysis.panoramaDiff.summaryLines?.length ?? 0) > 0 && (
        <div className="border border-slate-200 bg-slate-50 rounded p-2 space-y-1">
          <p className="font-medium text-slate-800">Panorama: mañana vs cierre</p>
          <ul className="list-disc pl-4">
            {analysis.panoramaDiff.summaryLines!.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      )}
      {analysis.panoramaEvening?.ready && (
        <MarketAiFoundationTrends panorama={analysis.panoramaEvening} />
      )}
      {report?.summary && <p className="text-gray-700">{report.summary}</p>}
      {outcomes && !outcomes.primaryAchieved && (
        <div className="border border-red-200 bg-red-50/60 rounded p-2 space-y-1">
          <p className="font-medium text-red-900">Análisis AI — por qué falló la estrategia</p>
          {(report?.whyNotAchieved?.length ?? 0) > 0 ? (
            <ul className="list-disc pl-4 space-y-0.5 text-red-900">
              {report!.whyNotAchieved!.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : (
            <p className="text-red-800">
              Sin detalle Bedrock — ejecuta post-market de nuevo o revisa outcomes Python.
            </p>
          )}
          {analysis.bedrockError && (
            <p className="text-amber-800 text-[10px]">Bedrock: {analysis.bedrockError}</p>
          )}
        </div>
      )}
      {outcomes?.primaryAchieved && (report?.whyNotAchieved?.length ?? 0) > 0 && (
        <div>
          <p className="font-medium text-gray-700">Notas:</p>
          <ul className="list-disc pl-4 space-y-0.5">
            {report!.whyNotAchieved!.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      )}
      {(report?.missedConsiderations?.length ?? 0) > 0 && (
        <div>
          <p className="font-medium text-amber-900">Qué faltó considerar:</p>
          <ul className="list-disc pl-4 space-y-0.5">
            {report!.missedConsiderations!.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      )}
      {(report?.suggestionsForEngine?.length ?? 0) > 0 && (
        <div>
          <p className="font-medium text-indigo-900">Sugerencias motor Python:</p>
          <ul className="list-disc pl-4 space-y-0.5">
            {report!.suggestionsForEngine!.map((s, i) => (
              <li key={`${s.suggestion}-${i}`}>
                [{s.priority ?? "medium"}] {s.suggestion}
                {s.targetRuleOrStrategy && (
                  <span className="text-gray-500"> → {s.targetRuleOrStrategy}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      {(report?.whatWorked?.length ?? 0) > 0 && (
        <p className="text-green-800">
          <span className="font-medium">Funcionó:</span> {report!.whatWorked!.join("; ")}
        </p>
      )}
      {(report?.lessonsForTomorrow?.length ?? 0) > 0 && (
        <p className="text-gray-600">
          <span className="font-medium">Mañana:</span> {report!.lessonsForTomorrow!.join("; ")}
        </p>
      )}
      {eff?.thisTicker && (eff.thisTicker.attempts ?? 0) > 0 && (
        <p className="text-gray-600 border-t border-amber-100 pt-1">
          Efectividad {analysis.symbol}: {eff.thisTicker.achievementPct ?? 0}% (
          {eff.thisTicker.achieved}/{eff.thisTicker.attempts} días)
        </p>
      )}
      {eff?.globalByStrategy && Object.keys(eff.globalByStrategy).length > 0 && (
        <div className="border-t border-amber-100 pt-1">
          <p className="font-medium text-gray-700">Efectividad global por estrategia:</p>
          <ul className="flex flex-wrap gap-x-3 gap-y-0.5">
            {Object.entries(eff.globalByStrategy)
              .sort((a, b) => (b[1].achievementPct ?? 0) - (a[1].achievementPct ?? 0))
              .map(([sid, row]) => (
                <li key={sid}>
                  {formatStrategyIdLabel(sid)}: {row.achievementPct ?? 0}% ({row.achieved}/
                  {row.attempts})
                </li>
              ))}
          </ul>
        </div>
      )}
      {analysis.bedrockError && (
        <p className="text-amber-800">
          Bedrock no completó JSON ({analysis.bedrockError}) — reporte desde checklist Python.
        </p>
      )}
    </div>
  );
}
