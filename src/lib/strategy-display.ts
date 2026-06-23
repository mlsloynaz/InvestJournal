import type {
  FinanceAiGapBollingerOutlook,
  FinanceAiGapBollingerTfOutlook,
  FinanceAiPremarketAnalysis,
  FinanceAiSessionGap,
  FinanceAiStrategyCheckItem,
  FinanceAiStrategyFit,
} from "@/lib/finance-ai-types";
import { formatBarDatetime, formatFinanceAiTimestamp, formatRuleMetAtEt } from "@/lib/format-datetime";

const ENTRY_RULE_KEYS = new Set([
  "hourly_candle_confirm",
  "opening_window_5m",
  "volume_stoch_hour",
]);

const BROKER_EXECUTION_RULE = "options_execution";

const FIT_RANK: Record<string, number> = { high: 3, medium: 2, low: 1, none: 0 };

/** Canonical short names (aligned with estrategia-*.md / strategyall.md). */
export const STRATEGY_CANONICAL_NAMES: Record<string, string> = {
  "estrategia-01": "Cambio de Tendencia Bolinger H",
  "estrategia-02": "Rebote punto medio DÍA",
  "estrategia-03": "Efecto imán",
  "estrategia-04": "Lateral BB15 + gap",
};

/** Proposed entry timing window per strategy (mirrors backend STRATEGY_TIMING_PROFILE). */
export const STRATEGY_PROPOSED_ENTRY: Record<string, string> = {
  "estrategia-01": "9:30–11:00 ET (ruptura H + confirmación 15m)",
  "estrategia-02": "Horas–2 días (rebote MA20 día)",
  "estrategia-03": "9:30–10:30 ET (gap + confirmación 15m)",
  "estrategia-04": "9:30–9:35 ET (apertura, primeros 5 min)",
};

export function strategyProposedEntry(strategyId?: string | null): string | null {
  if (!strategyId?.trim()) return null;
  return STRATEGY_PROPOSED_ENTRY[strategyId.trim().toLowerCase()] ?? null;
}

/** Result Now pane focuses on Estrategia 01 (Cambio de Tendencia H). */
export const RESULT_NOW_FOCUS_STRATEGY_IDS = ["estrategia-01"] as const;

export function filterStrategyFits(
  strategies: FinanceAiStrategyFit[] | undefined,
  strategyIds?: readonly string[] | null
): FinanceAiStrategyFit[] {
  const list = Array.isArray(strategies) ? strategies : [];
  if (!strategyIds?.length) return list;
  const allow = new Set(strategyIds.map((id) => id.toLowerCase()));
  return list.filter((s) => allow.has((s.strategyId ?? "").toLowerCase()));
}

export function strategyCanonicalName(strategyId?: string | null): string | null {
  if (!strategyId?.trim()) return null;
  return STRATEGY_CANONICAL_NAMES[strategyId.trim().toLowerCase()] ?? null;
}

export function formatStrategyIdLabel(strategyId?: string | null): string {
  if (!strategyId?.trim()) return "—";
  return strategyCanonicalName(strategyId) ?? strategyId;
}

export function isStrategyQualified(s: FinanceAiStrategyFit): boolean {
  return (s.fit ?? "none") !== "none";
}

/** All automatable checklist items are met (session entry ready). */
export function isStrategyFullyMet(strategy: FinanceAiStrategyFit): boolean {
  if (!isStrategyQualified(strategy)) return false;
  const scorable = (strategy.checklist ?? []).filter(
    (item) => item.automatable !== "false" && item.status !== "manual" && !isEntryActionChecklistItem(item)
  );
  if (scorable.length === 0) return false;
  return scorable.every((item) => item.status === "met");
}

export function detectBestStrategyFit(analysis: FinanceAiPremarketAnalysis): string | null {
  const strategies = analysis.strategyChecklist?.strategies;
  if (!Array.isArray(strategies)) return null;
  let best: string | null = null;
  let bestRank = 0;
  for (const s of strategies) {
    const fit = s.fit ?? "none";
    const rank = FIT_RANK[fit] ?? 0;
    if (rank > bestRank) {
      bestRank = rank;
      best = fit;
    }
  }
  return bestRank > 0 ? best : null;
}

export function analysisHasQualifiedStrategy(analysis: FinanceAiPremarketAnalysis): boolean {
  return detectBestStrategyFit(analysis) != null;
}

export function fitProbabilityLabel(fit?: string | null): string {
  switch (fit) {
    case "high":
      return "prob. alta";
    case "medium":
      return "prob. media";
    case "low":
      return "prob. baja";
    default:
      return "";
  }
}

export function strategyTitle(s: FinanceAiStrategyFit): string {
  const canonical = strategyCanonicalName(s.strategyId);
  const variant = s.variantName?.trim();
  if (canonical && variant) return `${canonical} · ${variant}`;
  if (canonical) return canonical;
  const parts = [s.strategyId, s.variantName].filter(Boolean);
  return parts.join(" · ") || s.strategyTitle || "Estrategia";
}

export function firstDisqualifyReason(s: FinanceAiStrategyFit): string {
  const notMet = (s.checklist ?? []).filter((item) => item.status === "not_met");
  if (notMet.length > 0) {
    const item = notMet[0];
    const label = item.label ?? item.requirementId ?? "Requisito";
    return item.evidence ? `${label} — ${item.evidence}` : label;
  }
  const partial = (s.checklist ?? []).find((item) => item.status === "partial");
  if (partial) {
    const label = partial.label ?? partial.requirementId ?? "Requisito";
    return partial.evidence ? `${label} — ${partial.evidence}` : label;
  }
  return "Puntuación insuficiente";
}

export function strategyEntryLine(s: FinanceAiStrategyFit): string | null {
  if (s.entryRequirements?.length) {
    const first = s.entryRequirements.find((req) => !isBrokerExecutionLabel(req));
    return first ?? null;
  }
  const item = (s.checklist ?? []).find(
    (i) =>
      i.ruleKey &&
      ENTRY_RULE_KEYS.has(i.ruleKey) &&
      i.ruleKey !== BROKER_EXECUTION_RULE &&
      i.label &&
      !isBrokerExecutionChecklistItem(i)
  );
  return item?.label ?? null;
}

function isBrokerExecutionLabel(text?: string | null): boolean {
  if (!text?.trim()) return false;
  const t = text.trim().toLowerCase();
  return (
    t.includes("en broker") ||
    t.includes("ejecución manual") ||
    t.includes("ejecucion manual") ||
    /^call$|^put$/.test(t)
  );
}

export function isBrokerExecutionChecklistItem(item: FinanceAiStrategyCheckItem): boolean {
  if (item.ruleKey === BROKER_EXECUTION_RULE) return true;
  return isBrokerExecutionLabel(item.label);
}

/** Entry window / broker steps — action notes, not scored checklist rows. */
export function isEntryActionChecklistItem(item: FinanceAiStrategyCheckItem): boolean {
  if (isBrokerExecutionChecklistItem(item)) return true;
  return item.ruleKey === "opening_window_5m";
}

/** Strategy-met tracker row — same broker rule, different shape. */
export function isBrokerMetRequirement(req: {
  ruleKey?: string | null;
  label?: string | null;
  status?: string | null;
}): boolean {
  if (req.ruleKey === BROKER_EXECUTION_RULE || req.ruleKey === "opening_window_5m") return true;
  if (req.status === "manual") return true;
  return isBrokerExecutionLabel(req.label);
}

export function strategyActionNotes(strategy: FinanceAiStrategyFit): FinanceAiStrategyCheckItem[] {
  return (strategy.checklist ?? []).filter((item) => isEntryActionChecklistItem(item));
}

export function strategyActionablePendingItems(
  strategy: FinanceAiStrategyFit
): FinanceAiStrategyCheckItem[] {
  return strategyPendingItems(strategy).filter((item) => !isEntryActionChecklistItem(item));
}

/** Post-market / premarket direction: flat = move within ±0.05%. */
export function sessionDirectionLabel(direction?: string | null): string {
  return direction ?? "—";
}

export function sessionDirectionHint(direction?: string | null): string | undefined {
  if (direction === "flat") {
    return "Movimiento menor a ±0.05% vs cierre regular (sin sesgo alcista/bajista)";
  }
  if (direction === "up") return "Subida mayor a +0.05%";
  if (direction === "down") return "Bajada mayor a −0.05%";
  return undefined;
}

export function formatSessionMoveLine(
  label: string,
  movePct?: number | null,
  direction?: string | null
): string {
  const pct = movePct != null ? movePct : "—";
  return `${label}: ${pct}% (${sessionDirectionLabel(direction)})`;
}

export type SessionGapLine = { key: string; text: string; title?: string };

export function sessionGapContextLines(
  sessionGap?: FinanceAiSessionGap | null
): SessionGapLine[] {
  if (!sessionGap) return [];
  const lines: SessionGapLine[] = [];
  const post = sessionGap.postMarketYesterday;
  if (post?.available) {
    const label = post.sessionDate ? `Post-market ${post.sessionDate}` : "Post-market ayer";
    lines.push({
      key: "post",
      text: formatSessionMoveLine(label, post.movePct, post.direction),
      title: sessionDirectionHint(post.direction),
    });
  }
  const pre = sessionGap.premarketToday;
  if (pre?.available) {
    const preLabel = pre.sessionDate ? `Premarket ${pre.sessionDate}` : "Premarket hoy";
    const implied = pre.impliedGapPct ?? sessionGap.impliedGapPct;
    lines.push({
      key: "pre",
      text: `${preLabel}: ${pre.movePct ?? "—"}% (${sessionDirectionLabel(pre.direction)}) · gap implícito ${implied ?? "—"}%`,
      title: sessionDirectionHint(pre.direction),
    });
  }
  return lines;
}

/** Post-market panel — extended session move on prior trade date only. */
export function sessionGapPostmarketLines(
  sessionGap?: FinanceAiSessionGap | null
): SessionGapLine[] {
  return sessionGapContextLines(sessionGap).filter((line) => line.key === "post");
}

const GAP_BB_SETUP_LABELS: Record<string, string> = {
  gap_below_bullish_bb: "Debajo de BB alcista",
  gap_above_bearish_bb: "Encima de BB bajista",
  above_bullish_bb: "Encima de BB alcista",
  below_bearish_bb: "Debajo de BB bajista",
  inside_bb: "Dentro de Bollinger",
};

const GAP_BB_EXPOSURE_LABELS: Record<string, string> = {
  below_lower: "banda inferior",
  above_upper: "banda superior",
  inside: "dentro",
  unknown: "—",
};

const GAP_BB_TF_LABELS: Record<string, string> = {
  "15m": "15m",
  "1h": "H",
  D: "D",
};

function gapBbTfLine(tf: FinanceAiGapBollingerTfOutlook | undefined): string | null {
  if (!tf?.available) return null;
  const tfLabel = GAP_BB_TF_LABELS[tf.timeframe ?? ""] ?? tf.timeframe ?? "?";
  const trend = tf.bbTrend ?? "—";
  const setup = tf.setup ? GAP_BB_SETUP_LABELS[tf.setup] : null;
  const exposure = GAP_BB_EXPOSURE_LABELS[tf.exposure ?? "unknown"] ?? tf.exposure;
  if (setup) return `${tfLabel}: BB ${trend} · ${setup}`;
  return `${tfLabel}: BB ${trend} · ${exposure}`;
}

export function gapBollingerPrimaryLabel(outlook?: FinanceAiGapBollingerOutlook | null): string | null {
  if (!outlook?.available || !outlook.primarySetup) return null;
  const kind = outlook.priceKind === "real" ? "Apertura real" : "Gap probable";
  const setup = GAP_BB_SETUP_LABELS[outlook.primarySetup] ?? outlook.primarySetup;
  return `${kind}: ${setup}`;
}

export function gapBollingerStrengthLabel(outlook?: FinanceAiGapBollingerOutlook | null): string | null {
  if (!outlook?.available) return null;
  if (outlook.strength === "strong") {
    return `Fuerte — ${outlook.strengthDetail ?? "H y D coinciden"}`;
  }
  if (outlook.strength === "moderate") {
    return `Moderado — ${outlook.strengthDetail ?? "parcial en H/D"}`;
  }
  if (outlook.strength === "none") {
    return "Sin separación clave — dentro de BB en H y D";
  }
  if (outlook.strength === "weak") {
    return "Débil — H y D no alinean separación";
  }
  return null;
}

export function gapBollingerTimeframeLines(
  outlook?: FinanceAiGapBollingerOutlook | null
): string[] {
  if (!outlook?.available) return [];
  const tfs = outlook.timeframes ?? {};
  return (["D", "1h", "15m"] as const)
    .map((key) => gapBbTfLine(tfs[key]))
    .filter((line): line is string => Boolean(line));
}

export type StrategyEvalContext = {
  evaluatedAt?: string | null;
  tradeDate?: string | null;
  phase?: string | null;
  dataCutoffEt?: string | null;
  hourlyThrough?: string | null;
  min15Through?: string | null;
  dailyThrough?: string | null;
};

/** Bar timestamps used for the checklist (already happened). */
export function strategyDataAsOf(ctx: StrategyEvalContext): string | null {
  const phase = (ctx.phase ?? "").toUpperCase();
  const cutoff =
    ctx.dataCutoffEt?.trim() ||
    (phase === "PRE" ? "09:29 ET" : phase === "POST" ? "16:00 ET" : null);

  const parts: string[] = [];
  if (ctx.dailyThrough) parts.push(`D ${formatBarDatetime(ctx.dailyThrough)}`);
  if (ctx.hourlyThrough) parts.push(`1h ${formatBarDatetime(ctx.hourlyThrough)}`);
  if (ctx.min15Through) parts.push(`15m ${formatBarDatetime(ctx.min15Through)}`);

  if (parts.length > 0) {
    if (cutoff) return `${parts.join(" · ")} · corte ${cutoff}`;
    return parts.join(" · ");
  }

  if (phase === "PRE" && cutoff) {
    return `Velas intradía hasta ${cutoff}`;
  }
  if (phase === "POST" && cutoff) {
    return `Velas sesión hasta ${cutoff}`;
  }
  if (ctx.evaluatedAt) return formatFinanceAiTimestamp(ctx.evaluatedAt);
  return null;
}

export function strategyEvalContextFromChecklist(
  checklist?: { evalDataWindow?: StrategyEvalContext } | null,
  fallback?: StrategyEvalContext
): StrategyEvalContext {
  const w = checklist?.evalDataWindow;
  return {
    evaluatedAt: w?.evaluatedAt ?? fallback?.evaluatedAt ?? null,
    tradeDate: w?.tradeDate ?? fallback?.tradeDate ?? null,
    phase: w?.phase ?? fallback?.phase ?? null,
    dataCutoffEt: w?.dataCutoffEt ?? fallback?.dataCutoffEt ?? null,
    hourlyThrough: w?.hourlyThrough ?? fallback?.hourlyThrough ?? null,
    min15Through: w?.min15Through ?? fallback?.min15Through ?? null,
    dailyThrough: w?.dailyThrough ?? fallback?.dailyThrough ?? null,
  };
}

export function strategyPendingItems(strategy: FinanceAiStrategyFit): FinanceAiStrategyCheckItem[] {
  return (strategy.checklist ?? []).filter(
    (item) =>
      item.status === "not_met" ||
      item.status === "partial" ||
      item.status === "manual" ||
      item.status === "unknown"
  );
}

function sessionGapOutlook(
  sessionGap: FinanceAiSessionGap | null | undefined,
  direction: string
): string[] {
  if (!sessionGap) return [];
  const lines: string[] = [];
  const pre = sessionGap.premarketToday;
  const implied = Number(pre?.impliedGapPct ?? sessionGap.impliedGapPct ?? 0);
  if (!pre?.available) return lines;

  if (direction === "CALL") {
    if (pre.direction === "up" || implied > 0.05) {
      lines.push(
        "Tras 9:30 ET: vigilar continuación alcista o rechazo del gap — la entrada depende de la confirmación en ventana."
      );
    } else if (Math.abs(implied) <= 0.05) {
      lines.push(
        "Tras 9:30 ET: gap plano — la dirección se define en los primeros minutos (9:30–9:35 ET)."
      );
    } else {
      lines.push(
        "Tras 9:30 ET: pre-market débil vs setup CALL — esperar confirmación antes de entrar."
      );
    }
  } else if (direction === "PUT") {
    if (pre.direction === "down" || implied < -0.05) {
      lines.push(
        "Tras 9:30 ET: vigilar continuación bajista o rebote falso — confirmar en ventana antes de PUT."
      );
    } else if (Math.abs(implied) <= 0.05) {
      lines.push(
        "Tras 9:30 ET: gap plano — buscar confirmación bajista en apertura o primeros 5 min."
      );
    } else {
      lines.push(
        "Tras 9:30 ET: pre-market fuerte vs setup PUT — esperar debilidad o rechazo."
      );
    }
  }
  return lines;
}

/** Forward-looking lines worth showing under "Próximo" (no generic setup boilerplate). */
export function strategyOutlook(
  strategy: FinanceAiStrategyFit,
  sessionGap?: FinanceAiSessionGap | null
): string[] {
  const lines: string[] = [];
  const dir = (strategy.direction ?? "").toUpperCase();

  if (!isStrategyQualified(strategy)) {
    const actionable = strategyActionablePendingItems(strategy);
    if (actionable.length > 0) {
      const watch = actionable
        .slice(0, 2)
        .map((p) => p.label)
        .filter(Boolean)
        .join("; ");
      if (watch) lines.push(`Si cambia el mercado, vigilar: ${watch}.`);
    }
    lines.push(...sessionGapOutlook(sessionGap, dir));
    return lines;
  }

  const when = strategyActionTiming(strategy);
  if (when.length > 0) {
    lines.push(`Ventana de acción: ${when.join(" · ")}`);
  }

  lines.push(...sessionGapOutlook(sessionGap, dir));

  for (const item of strategyActionablePendingItems(strategy).slice(0, 4)) {
    const line = strategyOutlookPendingLine(item);
    if (line) lines.push(line);
  }

  return lines;
}

function strategyOutlookPendingLine(item: FinanceAiStrategyCheckItem): string | null {
  if (isBrokerExecutionChecklistItem(item) || item.status === "manual") return null;
  const label = item.label ?? item.requirementId ?? "Requisito";
  const timing = checklistItemTimingLabel(item);
  const prefix = timing ? `${timing} — ` : "";
  if (item.status === "not_met") {
    return `Aún debe cumplirse: ${prefix}${label}.`;
  }
  if (item.status === "partial") {
    return `Vigilar en sesión: ${prefix}${label} (parcial).`;
  }
  if (item.status === "unknown") {
    return `Sin dato automático: ${prefix}${label}.`;
  }
  return null;
}

/** Map API variants to a single checklist array for UI progress + rules. */
export function normalizeStrategyFitForDisplay(strategy: FinanceAiStrategyFit): FinanceAiStrategyFit {
  const checklist = strategy.checklist ?? [];
  if (checklist.length > 0) return strategy;
  const requirements = strategy.requirements ?? [];
  if (requirements.length > 0) {
    return { ...strategy, checklist: requirements };
  }
  return strategy;
}

export type StrategyChecklistProgress = {
  met: number;
  partial: number;
  total: number;
  metPct: number;
  weightedPct: number;
};

/** Checklist progress excluding broker-execution and entry-action noise. */
export function strategyChecklistProgress(strategy: FinanceAiStrategyFit): StrategyChecklistProgress {
  const normalized = normalizeStrategyFitForDisplay(strategy);
  const items = (normalized.checklist ?? []).filter((i) => !isEntryActionChecklistItem(i));
  let met = items.filter((i) => i.status === "met").length;
  let partial = items.filter((i) => i.status === "partial").length;
  let total = items.length;

  if (total === 0) {
    const summary = normalized.summary;
    if (summary?.total != null && summary.total > 0) {
      met = summary.met ?? 0;
      partial = summary.partial ?? 0;
      total = summary.total;
    }
  }

  if (total === 0) {
    const basis = normalized.probabilityBasis;
    const basisTotal =
      basis?.scorableRequirements ??
      (basis?.mandatoryRequirements ?? 0) + (basis?.supportRequirements ?? 0);
    if (basisTotal > 0) {
      met = basis.met ?? 0;
      partial = basis.partial ?? 0;
      total = basisTotal;
    }
  }

  if (total > 0) {
    const metPct = Math.round((met / total) * 100);
    const weightedPct = Math.round(((met + partial * 0.5) / total) * 100);
    return { met, partial, total, metPct, weightedPct };
  }

  const weightedPct = Math.round(strategyProbabilityPct(normalized));
  if (normalized.probabilityPct != null || (normalized.fit ?? "none") !== "none") {
    return {
      met: 0,
      partial: 0,
      total: 100,
      metPct: weightedPct,
      weightedPct,
    };
  }

  return { met: 0, partial: 0, total: 0, metPct: 0, weightedPct: 0 };
}

export function strategyEntrySummary(strategy: FinanceAiStrategyFit): string | null {
  const entry = strategyEntryLine(strategy);
  const dir = strategy.direction?.trim();
  if (!entry || isBrokerExecutionLabel(entry)) return null;
  if (dir && entry.toUpperCase() === dir.toUpperCase()) return null;
  if (dir && entry.toLowerCase() === `${dir.toLowerCase()} en broker`) return null;
  if (dir && entry) return `${dir} — ${entry}`;
  if (dir) return null;
  return entry;
}

export type StrategyRuleDisplayTone = "met" | "confirm" | "near" | "expired";

export type StrategyRuleDisplay = {
  item: FinanceAiStrategyCheckItem;
  tone: StrategyRuleDisplayTone;
  label: string;
};

function strategyRuleDisplayTone(item: FinanceAiStrategyCheckItem): StrategyRuleDisplayTone {
  if (item.status === "met") return "met";
  if (item.status === "partial") return "near";
  if (item.ruleKey === "opening_window_5m" && item.status === "not_met") return "expired";
  return "confirm";
}

/** Checklist rows for UI: green = cumple, amber = cerca, orange = confirmar, red = ventana cerrada. */
export function strategyRulesForDisplay(strategy: FinanceAiStrategyFit): StrategyRuleDisplay[] {
  return (normalizeStrategyFitForDisplay(strategy).checklist ?? [])
    .filter((item) => !isEntryActionChecklistItem(item))
    .map((item) => ({
      item,
      tone: strategyRuleDisplayTone(item),
      label: item.label?.trim() || item.requirementId?.trim() || "Requisito",
    }));
}

/** Display label for when a met rule first satisfied — requires FinanceAI `metAtEt`. */
export function strategyRuleMetAtLabel(
  item: Pick<FinanceAiStrategyCheckItem, "metAtEt" | "metAt" | "status">
): string | null {
  if (item.status !== "met") return null;
  const raw = item.metAtEt?.trim() || item.metAt?.trim();
  if (!raw) return null;
  return formatRuleMetAtEt(raw);
}

export function strategyEntryDirection(strategy: FinanceAiStrategyFit): "CALL" | "PUT" | null {
  const dir = strategy.direction?.trim().toUpperCase();
  if (dir === "CALL" || dir === "PUT") return dir;
  return null;
}

export function formatStrategyProbabilityShort(strategy: FinanceAiStrategyFit): string {
  return `${strategyProbabilityPct(strategy)}%`;
}

const RULE_TIMING: Record<string, string> = {
  opening_window_5m: "9:30–9:35 ET (primeros 5 min)",
  hourly_candle_confirm: "Tras cierre vela 1h",
  volume_stoch_hour: "Vela hora (volumen / stoch)",
  gap_open: "Gap overnight (premarket → apertura)",
};

const TF_TIMING: Record<string, string> = {
  D: "Marco día",
  "1h": "Marco hora",
  "15m": "Marco 15 min",
  execution: "Ejecución",
};

/** When the strategy expects action (entry window / confirmation). */
export function strategyActionTiming(strategy: FinanceAiStrategyFit): string[] {
  const lines: string[] = [];
  for (const req of strategy.entryRequirements ?? []) {
    const t = req?.trim();
    if (t && !isBrokerExecutionLabel(t)) lines.push(t);
  }
  if (lines.length > 0) return [...new Set(lines)];

  const seen = new Set<string>();
  for (const item of strategy.checklist ?? []) {
    const rk = item.ruleKey;
    if (!rk || rk === BROKER_EXECUTION_RULE || !RULE_TIMING[rk] || seen.has(RULE_TIMING[rk])) {
      continue;
    }
    seen.add(RULE_TIMING[rk]);
    lines.push(RULE_TIMING[rk]);
  }
  return lines;
}

export function checklistItemTimingLabel(item: FinanceAiStrategyCheckItem): string | null {
  const rk = item.ruleKey;
  if (rk && RULE_TIMING[rk]) return RULE_TIMING[rk];
  const tf = item.timeframe;
  if (tf && TF_TIMING[tf]) return TF_TIMING[tf];
  return null;
}

const STATUS_WEIGHT: Record<string, number> = {
  met: 1,
  partial: 0.5,
  unknown: 0.25,
  not_met: 0,
};

/** 0–100 mandatory base + support bonus (matches Python foundation). */
export function strategyProbabilityPct(strategy: FinanceAiStrategyFit): number {
  if (strategy.probabilityPct != null && !Number.isNaN(strategy.probabilityPct)) {
    return strategy.probabilityPct;
  }
  const checklist = strategy.checklist ?? [];
  const mandatory = checklist.filter(
    (item) =>
      item.automatable !== "false" &&
      item.status !== "manual" &&
      (item.classification ?? "mandatory") === "mandatory"
  );
  if (mandatory.length === 0) return 0;
  const base =
    (mandatory.reduce((sum, item) => sum + (STATUS_WEIGHT[item.status ?? ""] ?? 0), 0) /
      mandatory.length) *
    100;
  const supportBonus = checklist
    .filter(
      (item) =>
        item.classification === "support" &&
        item.automatable !== "false" &&
        item.status === "met"
    )
    .reduce((sum, item) => sum + (item.supportBonusPct ?? 5), 0);
  return Math.round((Math.min(base, 100) + supportBonus) * 10) / 10;
}

export function formatStrategyProbability(strategy: FinanceAiStrategyFit): string {
  const pct = strategyProbabilityPct(strategy);
  const basis = strategy.probabilityBasis;
  const summary = strategy.summary;
  const met = basis?.met ?? summary?.met ?? 0;
  const partial = basis?.partial ?? summary?.partial ?? 0;
  const mandatoryCount = basis?.mandatoryRequirements ?? basis?.scorableRequirements ?? 0;
  const supportBonus = basis?.supportBonusPct ?? 0;
  const supportMet = basis?.supportMetCount ?? 0;
  if (mandatoryCount > 0) {
    const base = basis?.mandatoryPct ?? pct;
    const bonusPart =
      supportBonus > 0 ? ` +${supportBonus}% extra (${supportMet} confirmaciones)` : "";
    return `${pct}% · base ${base}%${bonusPart} · ${met} cumplidos · ${partial} parcial · ${mandatoryCount} obligatorios`;
  }
  return `${pct}%`;
}

export function strategyExpectedTiming(
  strategy: FinanceAiStrategyFit,
  phase?: string | null
): string {
  const phaseU = (phase ?? "").toUpperCase();
  const sid = strategy.strategyId ?? "";
  const defaults: Record<string, string> = {
    "estrategia-04": "9:30–9:35 ET (apertura, primeros 5 min)",
    "estrategia-03": "9:30–10:30 ET (gap + confirmación 15m)",
    "estrategia-01": "9:30–11:00 ET (ruptura H + confirmación 15m)",
    "estrategia-02": "Horas–2 días (rebote MA20 día)",
  };
  if (phaseU === "PRE" && defaults[sid]) return defaults[sid];

  let timing = strategy.expectedTiming?.trim();
  if (timing && isBrokerExecutionLabel(timing)) timing = undefined;
  if (timing) return timing;

  if (defaults[sid]) return defaults[sid];
  const when = strategyActionTiming(strategy);
  return when[0] ?? "Ver playbook";
}

const STRATEGY_TIMING_ORDER: Record<string, number> = {
  "estrategia-04": 1,
  "estrategia-03": 2,
  "estrategia-01": 3,
  "estrategia-02": 4,
};

/** Qualified first; then earliest expected window; then highest probability. */
export function sortStrategiesByPriority(
  strategies: FinanceAiStrategyFit[]
): FinanceAiStrategyFit[] {
  return [...strategies].sort((a, b) => {
    const qa = isStrategyQualified(a) ? 0 : 1;
    const qb = isStrategyQualified(b) ? 0 : 1;
    if (qa !== qb) return qa - qb;
    const ta = a.timingOrder ?? STRATEGY_TIMING_ORDER[a.strategyId ?? ""] ?? 99;
    const tb = b.timingOrder ?? STRATEGY_TIMING_ORDER[b.strategyId ?? ""] ?? 99;
    if (ta !== tb) return ta - tb;
    return strategyProbabilityPct(b) - strategyProbabilityPct(a);
  });
}
