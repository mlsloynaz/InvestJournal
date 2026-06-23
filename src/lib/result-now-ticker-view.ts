import type {
  FinanceAiPanoramaCompleto,
  FinanceAiPanoramaTf,
  FinanceAiPremarketAnalysis,
  FinanceAiStrategyFit,
  FinanceAiStrategyMetEval,
  FinanceAiStrategyMetWindow,
} from "@/lib/finance-ai-types";
import type { PremarketUpdatedView } from "@/lib/premarket-display";
import {
  calendarBriefCheck,
  newsBriefCheck,
  panoramaFromAnalysis,
  resolveFocusStrategyDirection,
  resolveReferencePrice,
  strategyExitLevels,
  type BriefCheckLine,
  type StrategyExitLevels,
} from "@/lib/result-now-brief";
import {
  filterStrategyFits,
  isBrokerMetRequirement,
  isEntryActionChecklistItem,
  isStrategyFullyMet,
  isStrategyQualified,
  RESULT_NOW_FOCUS_STRATEGY_IDS,
  strategyActionNotes,
  strategyOutlook,
  strategyProbabilityPct,
  strategyRulesForDisplay,
  strategyTitle,
} from "@/lib/strategy-display";
import { isStrategyMetEvalFullyMet } from "@/lib/strategy-met-display";

export type ResultNowRequirementRow = {
  label: string;
  status: string;
  evidence?: string;
  metAtEt?: string;
  isVolatility: boolean;
  tone: "met" | "partial" | "pending" | "manual" | "expired";
};

export type VolatilitySnapshotLine = {
  timeframe: string;
  position?: string;
  volState?: string;
  widthPct?: number;
  fakeVolatility?: boolean;
};

export type ResultNowTickerView = {
  hasLiveUpdate: boolean;
  updatedAt?: string;
  waitNote?: string | null;
  gates: { calendar: BriefCheckLine | null; news: BriefCheckLine | null };
  strategy: {
    name: string;
    direction: "CALL" | "PUT" | null;
    fit?: string;
    qualified: boolean;
    fullyMet: boolean;
    probabilityPct: number;
    requirements: ResultNowRequirementRow[];
    volatilityLines: VolatilitySnapshotLine[];
  } | null;
  movement: {
    direction: "CALL" | "PUT";
    entryPrice?: number;
    levels: StrategyExitLevels;
  } | null;
  notes: string[];
  activeWindows: FinanceAiStrategyMetWindow[];
};

const VOL_RULE_RE = /^(bb_|bb_mid|bb_exposure|bb_lateral|vol_bb_expand)/i;

export function isVolatilityRelatedRequirement(req: {
  ruleKey?: string | null;
  label?: string | null;
}): boolean {
  const rk = (req.ruleKey ?? "").trim();
  if (VOL_RULE_RE.test(rk)) return true;
  const label = (req.label ?? "").toLowerCase();
  return (
    label.includes("bollinger") ||
    label.includes("volatil") ||
    label.includes("disipador") ||
    label.includes("punto medio")
  );
}

function requirementTone(status?: string, ruleKey?: string): ResultNowRequirementRow["tone"] {
  if (status === "met") return "met";
  if (status === "partial") return "partial";
  if (status === "manual") return "manual";
  if (ruleKey === "opening_window_5m" && status === "not_met") return "expired";
  return "pending";
}

function rowsFromStrategyFit(strategy: FinanceAiStrategyFit): ResultNowRequirementRow[] {
  return strategyRulesForDisplay(strategy).map((row) => ({
    label: row.label,
    status: row.item.status ?? "unknown",
    evidence: row.item.evidence,
    metAtEt: row.item.metAtEt ?? row.item.metAt,
    isVolatility: isVolatilityRelatedRequirement(row.item),
    tone:
      row.tone === "met"
        ? "met"
        : row.tone === "near"
          ? "partial"
          : row.tone === "expired"
            ? "expired"
            : "pending",
  }));
}

function rowsFromMetEval(strategy: FinanceAiStrategyMetEval): ResultNowRequirementRow[] {
  return (strategy.requirements ?? [])
    .filter((r) => !isBrokerMetRequirement(r))
    .map((r) => ({
      label: r.label?.trim() || r.requirementId?.trim() || "Requisito",
      status: r.status ?? "unknown",
      evidence: r.evidence,
      metAtEt: r.metAtEt ?? r.metAt,
      isVolatility: isVolatilityRelatedRequirement(r),
      tone: requirementTone(r.status, r.ruleKey),
    }));
}

function timeframesForVolatility(
  strategy: FinanceAiStrategyFit | null,
  metEval: FinanceAiStrategyMetEval | null
): Array<"15m" | "1h" | "D"> {
  const tfs = new Set<"15m" | "1h" | "D">();
  const items: Array<{ ruleKey?: string | null; timeframe?: string | null }> = [
    ...(strategy?.checklist ?? []),
    ...(metEval?.requirements ?? []),
  ];
  for (const item of items) {
    if (!isVolatilityRelatedRequirement(item)) continue;
    const rk = (item.ruleKey ?? "").toLowerCase();
    const tf = (item.timeframe ?? "").toLowerCase();
    if (rk.includes("15m") || tf === "15m") tfs.add("15m");
    if (rk.includes("1h") || tf === "1h") tfs.add("1h");
    if (rk.includes("daily") || rk.endsWith("_d") || tf === "d") tfs.add("D");
  }
  if (tfs.size === 0) {
    tfs.add("15m");
    tfs.add("1h");
  }
  return [...tfs];
}

function volatilityFromPanorama(
  panorama: FinanceAiPanoramaCompleto | null | undefined,
  timeframes: Array<"15m" | "1h" | "D">
): VolatilitySnapshotLine[] {
  if (!panorama?.timeframes) return [];
  const lines: VolatilitySnapshotLine[] = [];
  for (const tf of timeframes) {
    const snap = panorama.timeframes[tf] as FinanceAiPanoramaTf | undefined;
    if (!snap?.bollinger && snap?.available === false) continue;
    lines.push({
      timeframe: tf,
      position: snap?.bollinger?.position,
      volState: snap?.bollinger?.volState,
      widthPct: snap?.bollinger?.widthPct,
      fakeVolatility: snap?.fakeVolatility,
    });
  }
  return lines;
}

function resolveFocusStrategy(
  analysis: FinanceAiPremarketAnalysis | null,
  updatedView: PremarketUpdatedView | null,
  evalRow: { strategies?: FinanceAiStrategyMetEval[] } | null | undefined,
  strategyIds: readonly string[]
): { fit: FinanceAiStrategyFit | null; metEval: FinanceAiStrategyMetEval | null } {
  const liveList = filterStrategyFits(
    updatedView?.live?.strategyChecklist?.strategies ??
      updatedView?.merged?.strategyChecklist?.strategies ??
      analysis?.strategyChecklist?.strategies,
    strategyIds
  );
  const live =
    liveList.find((s) => isStrategyQualified(s)) ??
    liveList[0] ??
    null;

  const metList = (evalRow?.strategies ?? []).filter(
    (s) => s.qualified && strategyIds.some((id) => id.toLowerCase() === (s.strategyId ?? "").toLowerCase())
  );
  const metEval = metList[0] ?? (evalRow?.strategies ?? []).find((s) =>
    strategyIds.some((id) => id.toLowerCase() === (s.strategyId ?? "").toLowerCase())
  ) ?? null;

  return { fit: live, metEval };
}

function collectNotes(
  strategy: FinanceAiStrategyFit | null,
  updatedView: PremarketUpdatedView | null,
  analysis: FinanceAiPremarketAnalysis | null,
  panorama: FinanceAiPanoramaCompleto | null | undefined,
  levels: StrategyExitLevels | null
): string[] {
  const notes: string[] = [];
  if (updatedView?.proximityNote) notes.push(updatedView.proximityNote);
  if (levels?.horizonNote) notes.push(levels.horizonNote);

  if (strategy) {
    for (const item of strategyActionNotes(strategy)) {
      const label = item.label?.trim();
      if (!label) continue;
      if (item.status === "not_met" && item.ruleKey === "opening_window_5m") {
        notes.push(`No entrar tras 9:35 ET — ventana de apertura cerrada.`);
        continue;
      }
      if (item.status === "manual") {
        notes.push(label);
        continue;
      }
      if (item.status !== "met") {
        notes.push(label);
      }
    }
    for (const line of strategyOutlook(strategy, analysis?.sessionGap ?? updatedView?.merged?.sessionGap)) {
      if (line && !notes.includes(line)) notes.push(line);
    }
  }

  for (const flag of panorama?.flags ?? []) {
    if (flag.message && (flag.kind === "fake_volatility" || flag.severity === "warning")) {
      notes.push(flag.message);
    }
  }
  for (const hint of panorama?.strategyHints ?? []) {
    if (hint.message) notes.push(hint.message);
  }

  return [...new Set(notes)].slice(0, 6);
}

export function buildResultNowTickerView(input: {
  analysis: FinanceAiPremarketAnalysis | null;
  updatedView: PremarketUpdatedView | null;
  evalRow?: {
    updatedAt?: string;
    price?: number;
    strategies?: FinanceAiStrategyMetEval[];
  } | null;
  activeWindows?: FinanceAiStrategyMetWindow[];
  strategyIdsFilter?: readonly string[];
}): ResultNowTickerView {
  const strategyIds = input.strategyIdsFilter ?? RESULT_NOW_FOCUS_STRATEGY_IDS;
  const updatedView = input.updatedView;
  const analysis = input.analysis;
  const context = updatedView?.contextForBrief ?? analysis;
  const panorama = panoramaFromAnalysis(context);

  const calendarGate = context?.calendarGate ?? context?.strategyChecklist?.calendarGate;
  const direction =
    resolveFocusStrategyDirection(context?.strategyChecklist?.strategies, strategyIds) ??
    resolveFocusStrategyDirection(updatedView?.live?.strategyChecklist?.strategies, strategyIds);

  const gates = {
    calendar: calendarBriefCheck(calendarGate),
    news: newsBriefCheck(context?.newsSentiment, direction),
  };

  const { fit, metEval } = resolveFocusStrategy(input.analysis, updatedView, input.evalRow, strategyIds);

  let strategyBlock: ResultNowTickerView["strategy"] = null;
  if (fit || metEval) {
    const requirements = (fit ? rowsFromStrategyFit(fit) : rowsFromMetEval(metEval!)).sort(
      (a, b) => {
        if (a.isVolatility !== b.isVolatility) return a.isVolatility ? -1 : 1;
        const order = { met: 0, partial: 1, pending: 2, manual: 3, expired: 4 };
        return (order[a.tone] ?? 5) - (order[b.tone] ?? 5);
      }
    );
    const dirRaw = (fit?.direction ?? metEval?.direction ?? "").toUpperCase();
    const dir = dirRaw === "CALL" || dirRaw === "PUT" ? dirRaw : null;
    const volTfs = timeframesForVolatility(fit, metEval);
    const hasVolReq = requirements.some((r) => r.isVolatility);
    strategyBlock = {
      name: fit ? strategyTitle(fit) : metEval?.strategyName ?? "Estrategia",
      direction: dir,
      fit: fit?.fit ?? metEval?.fit,
      qualified: fit ? isStrategyQualified(fit) : Boolean(metEval?.qualified),
      fullyMet: fit ? isStrategyFullyMet(fit) : isStrategyMetEvalFullyMet(metEval!),
      probabilityPct: fit ? strategyProbabilityPct(fit) : metEval?.probabilityPct ?? 0,
      requirements,
      volatilityLines: hasVolReq ? volatilityFromPanorama(panorama, volTfs) : [],
    };
  }

  const entryPrice =
    input.evalRow?.price ??
    resolveReferencePrice(panorama) ??
    undefined;

  const moveDirection =
    strategyBlock?.direction ??
    direction ??
    (resolveFocusStrategyDirection(context?.strategyChecklist?.strategies) ?? null);

  let movement: ResultNowTickerView["movement"] = null;
  if (moveDirection) {
    const levels = strategyExitLevels(
      moveDirection,
      panorama,
      context?.keyLevels,
      entryPrice
    );
    if (levels) {
      movement = { direction: moveDirection, entryPrice, levels };
    }
  }

  const notes = collectNotes(fit, updatedView, analysis, panorama, movement?.levels ?? null);

  return {
    hasLiveUpdate: Boolean(updatedView?.hasLiveUpdate),
    updatedAt: updatedView?.updatedAt ?? input.evalRow?.updatedAt,
    waitNote: updatedView?.waitNote,
    gates,
    strategy: strategyBlock,
    movement,
    notes,
    activeWindows: input.activeWindows ?? [],
  };
}

export function requirementStatusSymbol(tone: ResultNowRequirementRow["tone"]): string {
  if (tone === "met") return "✓";
  if (tone === "partial") return "~";
  if (tone === "manual") return "→";
  if (tone === "expired") return "✗";
  return "○";
}

/** Focus strategy (e.g. Estrategia 01) — all automatable requirements met after NOW. */
export function isResultNowFocusStrategyFullyMet(input: {
  analysis: FinanceAiPremarketAnalysis | null;
  updatedView: PremarketUpdatedView | null;
  evalRow?: {
    strategies?: FinanceAiStrategyMetEval[];
  } | null;
  activeWindows?: FinanceAiStrategyMetWindow[];
  strategyIdsFilter?: readonly string[];
}): boolean {
  const strategyIds = input.strategyIdsFilter ?? RESULT_NOW_FOCUS_STRATEGY_IDS;

  const view = buildResultNowTickerView({
    analysis: input.analysis,
    updatedView: input.updatedView,
    evalRow: input.evalRow,
    activeWindows: input.activeWindows,
    strategyIdsFilter: strategyIds,
  });
  if (view.strategy?.fullyMet) return true;

  for (const s of input.evalRow?.strategies ?? []) {
    if (!s.qualified) continue;
    const sid = (s.strategyId ?? "").toLowerCase();
    if (!strategyIds.some((id) => id.toLowerCase() === sid)) continue;
    if (isStrategyMetEvalFullyMet(s)) return true;
  }

  const live =
    input.updatedView?.live?.strategyChecklist?.strategies ??
    input.updatedView?.merged?.strategyChecklist?.strategies ??
    input.analysis?.strategyChecklist?.strategies;
  for (const s of filterStrategyFits(live, strategyIds)) {
    if (isStrategyFullyMet(s)) return true;
  }

  for (const w of input.activeWindows ?? []) {
    const sid = (w.strategyId ?? "").toLowerCase();
    if (!strategyIds.some((id) => id.toLowerCase() === sid)) continue;
    const total = w.requirementsTotal ?? 0;
    const met = w.requirementsMet ?? 0;
    if (total > 0 && met >= total) return true;
  }

  return false;
}
