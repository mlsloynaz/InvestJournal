import type {
  FinanceAiBolinger15DirectionConfirmation,
  FinanceAiBolinger15FastMovementStatus,
  FinanceAiBolinger15FastMovementTicker,
} from "@/lib/finance-ai-types";
import {
  effectiveTradingDateEt,
  isTradingSessionDayEt,
  minutesOfDayEt,
} from "@/lib/live-session-window";

const ET = "America/New_York";

export type Bb15TickerSignalView = {
  signal: string;
  direction: string | undefined;
  summary: string | undefined;
  checks: FinanceAiBolinger15FastMovementTicker["checks"];
};

export type Bb15RulesView = {
  met: number;
  total: number;
};

export function resolveBb15TickerSignal(row: FinanceAiBolinger15FastMovementTicker): Bb15TickerSignalView {
  const pre = row.precheck928;
  const opening = row.opening;
  const checks = opening?.checks ?? row.checks ?? pre?.checks;
  const validation = row.validation10am;
  const isSimulation = row.assessmentSource === "simulation";
  const rulesMet = opening?.checks?.rulesMet ?? row.rulesMet;
  const rulesTotal = opening?.checks?.rulesTotal ?? row.rulesTotal;
  const firstCandleEntry =
    row.entryReady === true || (rulesMet === rulesTotal && rulesTotal === 3);

  let signal =
    opening?.signal ??
    row.signal ??
    (pre?.candidate ? "watch" : "none");

  const validationOutcome = validation?.outcome;
  const predictionOutcome = firstCandleEntry
    ? "confirmed"
    : row.predictionOutcome ?? validationOutcome;

  if (!isSimulation) {
    if (predictionOutcome === "confirmed" && firstCandleEntry) {
      signal = "triggered";
    } else if (predictionOutcome === "confirmed") {
      signal = "confirmed";
    } else if (predictionOutcome === "failed") {
      signal = "failed";
    }
  }

  const direction =
    opening?.direction ??
    row.direction ??
    validation?.predictedDirection ??
    pre?.expectedDirection ??
    checks?.moveDirection;

  const summary =
    (firstCandleEntry ? opening?.summary ?? row.summary : undefined) ??
    opening?.summary ??
    row.summary ??
    (validationOutcome === "confirmed" || validationOutcome === "failed"
      ? validation?.summary
      : undefined) ??
    (pre?.candidate ? "Precheck 9:28 — candidato apertura" : undefined);

  return { signal, direction, summary, checks };
}

export type Bb15VolChecksView = {
  parentOk: boolean | undefined;
  greaterThanPrior: boolean | undefined;
  sameDirection: boolean | undefined;
  expansionRatio?: number;
  expansionTier?: string;
  volNote?: string;
  moveDirection?: string;
};

export type Bb15PrecheckVolView = {
  ayerClosed: boolean | undefined;
  ayerParallel: boolean | undefined;
  nowChanging: boolean | undefined;
  nowSameDirection: boolean | undefined;
};

export function resolveBb15PrecheckVol(
  row: FinanceAiBolinger15FastMovementTicker
): Bb15PrecheckVolView {
  const vol = row.volatility;
  if (vol?.volAyer || vol?.volNow) {
    return {
      ayerClosed: vol.volAyer?.closed,
      ayerParallel: vol.volAyer?.parallel,
      nowChanging: vol.volNow?.changing,
      nowSameDirection: vol.volNow?.sameDirection,
    };
  }
  const checks = row.precheck928?.checks ?? row.checks;
  const eod = row.eodSetup;
  return {
    ayerClosed:
      checks?.volAyerClosed ??
      eod?.volClosed ??
      (eod?.volPartialClosed === true ? true : undefined),
    ayerParallel: checks?.volAyerParallel ?? eod?.priorDayParallel ?? eod?.lateralBoost,
    nowChanging: checks?.volNowChanging,
    nowSameDirection: checks?.volNowSameDirection,
  };
}

export function resolveBb15VolChecks(
  checks: FinanceAiBolinger15FastMovementTicker["checks"],
  volatility?: FinanceAiBolinger15FastMovementTicker["volatility"]
): Bb15VolChecksView {
  if (volatility?.volHoy) {
    const hoy = volatility.volHoy;
    return {
      parentOk: hoy.ok,
      greaterThanPrior: hoy.greaterThanPrior,
      sameDirection: hoy.sameDirection,
      expansionRatio: hoy.expansionRatio,
      expansionTier: hoy.expansionTier,
      volNote: hoy.note,
      moveDirection: hoy.direction,
    };
  }
  const greaterThanPrior = checks?.volGreaterThanPriorDay;
  const sameDirection =
    checks?.volOpeningSameDirection ??
    checks?.volOpeningOnSide;
  const parentOk = checks?.volOpeningNewTrend ?? checks?.volOpeningOnSide;

  return {
    parentOk,
    greaterThanPrior,
    sameDirection,
    expansionRatio: checks?.volExpansionRatio,
    expansionTier: checks?.volExpansionTier,
    volNote: checks?.volNote,
    moveDirection: checks?.moveDirection,
  };
}

export type Bb15RuleItem = {
  id: string;
  label: string;
  met?: boolean;
  pending?: boolean;
  probable?: boolean;
  aboutToCross?: boolean;
  detail?: string;
};

/** Punto medio cut — premarket probable before 9:30; confirmed on 9:30 bar after open. */
export function resolvePuntoMedioCutRule(
  checks: FinanceAiBolinger15FastMovementTicker["checks"] | undefined,
  opts?: {
    beforeOpen?: boolean;
    precheckProbable?: boolean;
  }
): Bb15RuleItem {
  const probableFlag =
    opts?.precheckProbable ??
    checks?.puntoMedioCutProbable;

  if (opts?.beforeOpen) {
    if (probableFlag === true) {
      return {
        id: "puntoMedioCut",
        label: "Corte punto medio BB: probable pre-open",
        probable: true,
      };
    }
    if (probableFlag === false) {
      return {
        id: "puntoMedioCut",
        label: "Corte punto medio BB: poco probable",
        met: false,
      };
    }
    return {
      id: "puntoMedioCut",
      label: "Corte punto medio BB: pendiente pre-open",
      pending: true,
    };
  }

  if (!checks) {
    return {
      id: "puntoMedioCut",
      label: "Corte punto medio BB: pendiente",
      pending: true,
    };
  }

  const cutPending =
    checks.cutsPending === true ||
    (checks.cutsBbMiddle == null && checks.puntoMedioCutConfirmed == null);

  if (cutPending) {
    if (checks.cutsBbMiddleAboutToCross === true) {
      const dir = checks.cutsBbMiddleAboutToCrossDirection;
      const minEt = checks.cutsBbMiddleAboutToCrossEt;
      return {
        id: "puntoMedioCut",
        label: "Corte punto medio BB: por cruzar",
        aboutToCross: true,
        detail: [
          dir ? `→ ${dir.toUpperCase()}` : undefined,
          minEt ? `min ${minEt} ET` : undefined,
          formatBb15PuntoMedioCutDetail(checks),
        ]
          .filter(Boolean)
          .join(" · ") || undefined,
      };
    }
    if (probableFlag === true) {
      return {
        id: "puntoMedioCut",
        label: "Corte punto medio BB: probable",
        probable: true,
        detail: formatBb15PuntoMedioCutDetail(checks),
      };
    }
    return {
      id: "puntoMedioCut",
      label: "Corte punto medio BB: pendiente",
      pending: true,
      detail: formatBb15PuntoMedioCutDetail(checks),
    };
  }

  const met =
    checks.cutsBbMiddle === true || checks.puntoMedioCutConfirmed === true;

  if (checks.cutsBbMiddleAboutToCross === true && !met) {
    const dir = checks.cutsBbMiddleAboutToCrossDirection;
    return {
      id: "puntoMedioCut",
      label: "Corte punto medio BB: por cruzar",
      aboutToCross: true,
      detail: [
        dir ? `→ ${dir.toUpperCase()}` : undefined,
        checks.cutsBbMiddleAboutToCrossEt
          ? `min ${checks.cutsBbMiddleAboutToCrossEt} ET`
          : undefined,
        formatBb15PuntoMedioCutDetail(checks),
      ]
        .filter(Boolean)
        .join(" · ") || undefined,
    };
  }

  if (met) {
    const slot = checks.openingBarSlot;
    const cutDetail = formatBb15PuntoMedioCutDetail(checks, true);
    return {
      id: "puntoMedioCut",
      label: "Corte punto medio BB",
      met: true,
      detail: [slot ? `vela ${slot}` : undefined, cutDetail].filter(Boolean).join(" · ") || undefined,
    };
  }

  return {
    id: "puntoMedioCut",
    label: "Corte punto medio BB",
    met: false,
    detail: formatBb15PuntoMedioCutDetail(checks, false),
  };
}

export type Bb15DirectionConfirmView = {
  items: Bb15RuleItem[];
  confirmed?: boolean;
  probable?: boolean;
  counterTrend?: boolean;
  met: number;
  total: number;
};

export type Bb15PredictedDirectionView = {
  direction?: "up" | "down";
  label: string;
  status: "confirmed" | "probable" | "pending" | "none";
  statusLabel?: string;
  tooltipTitle: string;
  tooltipLines: string[];
  met: number;
  total: number;
};

function resolveDirectionConfObject(
  row: FinanceAiBolinger15FastMovementTicker
): FinanceAiBolinger15DirectionConfirmation | undefined {
  const pre = row.precheck928;
  const opening = row.opening;
  const checks = opening?.checks ?? row.checks ?? pre?.checks;
  return (
    row.directionConfirmation ??
    opening?.directionConfirmation ??
    pre?.directionConfirmation ??
    (checks
      ? {
          predictedDirection: checks.puntoMedioCutExpectedDirection,
          bbMidDirectionOk: checks.bbMidDirectionOk,
          bbMidSlope: checks.bbMidSlope,
          candleGrowthOk: checks.candleGrowthOk,
          candleDirection: checks.candleDirection,
          bandsOpeningOk: checks.bandsOpeningOk,
          bandsOpeningNote: checks.bandsOpeningNote,
          bbUpperSlope: checks.bbUpperSlope,
          counterTrendBoost: checks.counterTrendBoost,
          priorBb15TrendDirection: checks.priorTrendDirection,
          directionConfirmed: checks.directionConfirmed,
          directionProbable: checks.directionProbable,
          directionChecksMet: checks.directionChecksMet,
          directionChecksTotal: checks.directionChecksTotal,
          directionPhase: checks.directionPhase,
        }
      : undefined)
  );
}

function formatBandsNote(note: string | undefined): string {
  const map: Record<string, string> = {
    upper_band_rising: "upper band rising",
    upper_band_falling: "upper band falling",
    bands_not_expanding: "bands not widening",
    upper_band_wrong_side: "upper band on wrong side",
    insufficient_bars: "insufficient bars",
    no_direction: "no direction",
  };
  return map[note ?? ""] ?? note ?? "—";
}

function formatSlope(slope: string | undefined): string {
  const s = (slope ?? "unknown").toLowerCase();
  if (s === "up") return "rising";
  if (s === "down") return "falling";
  if (s === "flat") return "flat";
  return slope ?? "unknown";
}

export function resolveBb15PredictedDirection(
  row: FinanceAiBolinger15FastMovementTicker
): Bb15PredictedDirectionView {
  const conf = resolveDirectionConfObject(row);
  const { direction } = resolveBb15TickerSignal(row);
  const pre = row.precheck928;
  const raw =
    conf?.predictedDirection ??
    direction ??
    pre?.expectedDirection ??
    checksFallbackDirection(row);
  const d = (raw ?? "").toLowerCase();
  const label = d === "up" ? "UP" : d === "down" ? "DOWN" : "—";
  const met = conf?.directionChecksMet ?? 0;
  const total = conf?.directionChecksTotal ?? 3;

  const lines: string[] = [];

  if (label !== "—") {
    lines.push(`Signal: ${label} (${d === "up" ? "CALL" : "PUT"})`);
  }

  if (conf?.bbMidDirectionOk === true) {
    lines.push(`✓ BB mid (punto medio) aligned — ${formatSlope(conf.bbMidSlope)}`);
  } else if (conf?.bbMidDirectionOk === false) {
    lines.push(`○ BB mid not aligned — ${formatSlope(conf.bbMidSlope)}`);
  } else {
    lines.push("○ BB mid (punto medio) — pending");
  }

  if (conf?.candleGrowthOk === true) {
    lines.push(`✓ Candle growth aligned — ${conf.candleDirection ?? d}`);
  } else if (conf?.candleGrowthOk === false) {
    lines.push(`○ Candle growth opposite — ${conf.candleDirection ?? "—"}`);
  } else {
    lines.push("○ Candle growth — pending (9:30 bar)");
  }

  if (conf?.bandsOpeningOk === true) {
    lines.push(
      `✓ Bands opening — ${formatBandsNote(conf.bandsOpeningNote)} · upper ${formatSlope(conf.bbUpperSlope)}`
    );
  } else if (conf?.bandsOpeningOk === false) {
    lines.push(`○ Bands not aligned — ${formatBandsNote(conf.bandsOpeningNote)}`);
  } else {
    lines.push("○ Bands opening — pending");
  }

  if (conf?.priorBb15TrendDirection) {
    const prior = conf.priorBb15TrendDirection.toUpperCase();
    if (conf.counterTrendBoost) {
      lines.push(`+ Counter-trend vs prior day BB15 (${prior}) — higher probability`);
    } else {
      lines.push(`Prior day BB15 trend: ${prior}`);
    }
  } else if (row.eodSetup?.trendDirection || row.eodSetup?.bbMidSlope) {
    const prior = (row.eodSetup.trendDirection ?? row.eodSetup.bbMidSlope ?? "—").toUpperCase();
    if (conf?.counterTrendBoost) {
      lines.push(`+ Counter-trend vs prior day BB15 (${prior}) — higher probability`);
    } else {
      lines.push(`Prior day BB15 trend: ${prior}`);
    }
  }

  let status: Bb15PredictedDirectionView["status"] = "none";
  let statusLabel: string | undefined;

  if (conf?.directionConfirmed) {
    status = "confirmed";
    statusLabel = `Confirmed (${met}/${total})`;
    lines.push(`Conclusion: direction confirmed — all 3 signals aligned`);
  } else if (conf?.directionProbable) {
    status = "probable";
    statusLabel = `Probable (${met}/${total} + counter-trend)`;
    lines.push(`Conclusion: direction probable — ${met}/${total} signals + counter-trend boost`);
  } else if (label !== "—") {
    status = "pending";
    statusLabel = `Pending (${met}/${total})`;
    lines.push(`Conclusion: pending — ${met}/${total} signals aligned so far`);
  } else {
    lines.push("Conclusion: no direction yet");
  }

  if (conf?.directionPhase) {
    const phaseLabel =
      conf.directionPhase === "premarket_probable"
        ? "Premarket 9:28"
        : conf.directionPhase === "opening_confirmed"
          ? "Opening 9:30 bar"
          : conf.directionPhase === "opening_pending"
            ? "Waiting for 9:30 bar"
            : conf.directionPhase;
    lines.unshift(`Phase: ${phaseLabel}`);
  }

  const tooltipTitle =
    label !== "—" ? `Why ${label}?` : "Predicted direction";

  return {
    direction: d === "up" || d === "down" ? d : undefined,
    label,
    status,
    statusLabel,
    tooltipTitle,
    tooltipLines: lines,
    met,
    total,
  };
}

function checksFallbackDirection(row: FinanceAiBolinger15FastMovementTicker): string | undefined {
  const checks = row.opening?.checks ?? row.checks ?? row.precheck928?.checks;
  return checks?.moveDirection ?? checks?.puntoMedioCutExpectedDirection;
}

export function resolveBb15DirectionConfirm(
  row: FinanceAiBolinger15FastMovementTicker
): Bb15DirectionConfirmView {
  const conf = resolveDirectionConfObject(row);

  const bbMid = conf?.bbMidDirectionOk;
  const candle = conf?.candleGrowthOk;
  const bands = conf?.bandsOpeningOk;
  const counter = conf?.counterTrendBoost;

  const items: Bb15RuleItem[] = [
    {
      id: "bbMidDirection",
      label: "BB mid (punto medio)",
      met: bbMid ?? undefined,
    },
    {
      id: "candleGrowth",
      label: "Candle growth",
      met: candle ?? undefined,
      pending: candle == null,
    },
    {
      id: "bandsOpening",
      label: "Bands opening (upper)",
      met: bands ?? undefined,
      pending: bands == null,
    },
  ];

  if (counter === true) {
    items.push({
      id: "counterTrend",
      label: "vs prior day trend (+prob)",
      met: true,
    });
  }

  const met = conf?.directionChecksMet ?? items.filter((i) => i.met === true).length;
  const total = conf?.directionChecksTotal ?? 3;

  return {
    items,
    confirmed: conf?.directionConfirmed,
    probable: conf?.directionProbable,
    counterTrend: counter,
    met,
    total,
  };
}

function wasBb15PrecheckEvaluated(row: FinanceAiBolinger15FastMovementTicker): boolean {
  return Boolean(
    row.precheck928?.checks ||
      row.precheck928?.rulesMet != null ||
      row.manualAssessmentAt ||
      row.lastAssessmentPhase === "full_assessment" ||
      row.lastAssessmentPhase === "full_assessment_inside_b15m" ||
      row.lastAssessmentPhase === "in_market_now" ||
      row.lastAssessmentPhase === "post_market_now" ||
      row.assessmentSource === "manual" ||
      row.volatility?.volAyer?.closed != null
  );
}

function withPendingRules(items: Bb15RuleItem[], evaluated: boolean): Bb15RuleItem[] {
  if (evaluated) return items;
  return items.map((rule) => ({
    ...rule,
    pending: rule.met == null && !rule.probable,
  }));
}

function formatBb15Price(value: number | undefined): string | undefined {
  if (value == null || Number.isNaN(value)) return undefined;
  return Number(value).toFixed(2);
}

/** BB band context for Open dentro BB — bell BB @ 9:30 open. */
export function formatBb15OpensInsideBbDetail(
  checks: FinanceAiBolinger15FastMovementTicker["checks"] | undefined,
  met?: boolean
): string | undefined {
  const open =
    checks?.opensInsideOpenPrice ??
    checks?.openPrice;
  const upper = checks?.opensInsideBbUpper ?? checks?.bbUpper;
  const lower = checks?.opensInsideBbLower ?? checks?.bbLower;
  const slot = checks?.openingBarSlot;
  const brokenClose = (checks as { opensInsideBrokenAtClose?: number } | undefined)
    ?.opensInsideBrokenAtClose;

  if (open == null && upper == null && lower == null && brokenClose == null) {
    return undefined;
  }

  const parts: string[] = [];
  if (open != null) {
    parts.push(`open campana ${formatBb15Price(open)}`);
  }
  if (upper != null) {
    parts.push(`BB sup ${formatBb15Price(upper)}`);
  }
  if (lower != null) {
    parts.push(`BB inf ${formatBb15Price(lower)}`);
  }
  if (brokenClose != null) {
    parts.push(`cierre ${formatBb15Price(brokenClose)} fuera BB campana`);
  }
  if (slot) {
    parts.push(`vela ${slot}`);
  } else if (open != null && upper == null) {
    parts.push("sin vela 9:30/9:45 en datos");
  }
  if (checks?.openNearBandEdge === true && met !== true) {
    parts.push("cerca borde ±0.2%");
  }
  if (checks?.opensInsideBbReference?.includes("regular") || checks?.opensInsideBbReference?.includes("bell")) {
    parts.push("BB regular @ campana");
  } else if (checks?.opensInsideBbReference?.includes("forming")) {
    parts.push("BB forming 9:30–9:45");
  }
  return parts.length > 0 ? parts.join(" · ") : undefined;
}

export function formatBb15PuntoMedioCutDetail(
  checks: FinanceAiBolinger15FastMovementTicker["checks"] | undefined,
  met?: boolean
): string | undefined {
  if (!checks) {
    return undefined;
  }
  const parts: string[] = [];
  const mid = checks.cutsBbMiddleLevel ?? checks.opensInsideBbMiddle;
  const prev = checks.cutsBbMiddlePrevClose;
  const open = checks.cutsBbMiddleOpen;
  const close = checks.cutsBbMiddleClose;
  if (mid != null) {
    parts.push(`BB mid ${formatBb15Price(mid)}`);
  }
  if (prev != null) {
    parts.push(`cierre prev ${formatBb15Price(prev)}`);
  }
  if (open != null) {
    parts.push(`open ${formatBb15Price(open)}`);
  }
  if (close != null) {
    parts.push(`close ${formatBb15Price(close)}`);
  }
  if (checks.cutsBbMiddleCrossMode) {
    parts.push(checks.cutsBbMiddleCrossMode.replace(/_/g, " "));
  }
  if (parts.length === 0 && checks.cutsPending === true) {
    return "sin vela 9:30/9:45 en datos";
  }
  if (parts.length === 0 && met === false) {
    return undefined;
  }
  return parts.length > 0 ? parts.join(" · ") : undefined;
}

/** Vol expansion on forming 9:30–9:45 bucket — same settle tiers as backend. */
function resolveVolExpansionRule(
  checks: FinanceAiBolinger15FastMovementTicker["checks"] | undefined
): Bb15RuleItem {
  if (!checks) {
    return {
      id: "volExpandedAfterPremarket",
      label: "Vol BB expandió post-apertura: pendiente",
      pending: true,
    };
  }

  const met = checks.volExpandedAfterPremarket === true;
  const probable = checks.volExpansionProbable === true && !met;
  const pending = checks.volExpansionPending === true && !met && !probable;

  const tier = checks.volExpansionTier;
  const minEt =
    checks.volExpansionConfirmEt ??
    checks.volExpansionMinuteEt ??
    (checks.volExpansionMinute != null ? `min ${checks.volExpansionMinute}` : undefined);

  const detailParts: (string | undefined)[] = [
    tier === "first_5min_entry" ? "ventana 5 min" : tier ? `tier ${tier.replace(/_/g, " ")}` : undefined,
    checks.volExpansionConsensusScore != null
      ? `consenso ${checks.volExpansionConsensusScore}/6`
      : undefined,
    minEt,
    checks.volExpansionVsPremarketRatio != null
      ? `×${checks.volExpansionVsPremarketRatio}`
      : undefined,
    checks.volAfterPremarketNote?.replace(/_/g, " "),
    formatBb15VolExpansionDetail(checks),
  ];

  if (met) {
    return {
      id: "volExpandedAfterPremarket",
      label: "Vol BB expandió post-apertura",
      met: true,
      detail: detailParts.filter(Boolean).join(" · ") || undefined,
    };
  }
  if (probable) {
    return {
      id: "volExpandedAfterPremarket",
      label: "Vol BB expandió: consenso parcial",
      probable: true,
      detail: detailParts.filter(Boolean).join(" · ") || undefined,
    };
  }
  if (pending) {
    return {
      id: "volExpandedAfterPremarket",
      label: "Vol BB expandió: muy temprano",
      pending: true,
      detail: detailParts.filter(Boolean).join(" · ") || undefined,
    };
  }

  return {
    id: "volExpandedAfterPremarket",
    label: "Vol BB expandió post-apertura",
    met: false,
    detail: detailParts.filter(Boolean).join(" · ") || undefined,
  };
}

/** BB15 strategy — open inside @ bell gates vol / mid / trend. */
export function resolveBb15CoreRules(
  row: FinanceAiBolinger15FastMovementTicker
): Bb15RuleItem[] {
  const checks = row.opening?.checks ?? row.checks;
  const openingSlot = formatBb15OpeningBarDetail(checks);

  if (checks?.hourlyBbMidCrossOverride === true) {
    const overrideDetail =
      checks.hourlyBbMidOverrideNote ??
      (checks.hourlyBbMidCrossAt
        ? `1h BB mid @ ${checks.hourlyBbMidCrossAt}`
        : "1h BB mid cruzada — override 100%");
    const detail = [overrideDetail, openingSlot].filter(Boolean).join(" · ");
    return [
      {
        id: "opensInsideBb15m",
        label: "Open dentro BB 15m @ campana",
        met: true,
        detail,
      },
      {
        id: "volExpandedAfterPremarket",
        label: "Vol BB expandió post-apertura",
        met: true,
        detail,
      },
      {
        id: "puntoMedioCut",
        label: "Corte punto medio BB",
        met: true,
        detail,
      },
      {
        id: "cutsTrendReinforcement",
        label: "Corte de tendencia",
        met: true,
        detail,
      },
    ];
  }

  const opensInsideMet = checks?.opensInsideBb15m ?? checks?.insideBb15m;
  const opensInsideDetail = formatBb15OpensInsideBbDetail(checks, opensInsideMet);
  const gateFailed = checks?.openingGateFailed === true;

  const openInsideRule: Bb15RuleItem = {
    id: "opensInsideBb15m",
    label: "Open dentro BB 15m @ campana",
    met: opensInsideMet,
    detail: opensInsideDetail,
  };

  if (gateFailed) {
    return [
      openInsideRule,
      {
        id: "volExpandedAfterPremarket",
        label: "Vol BB expandió: omitido (open fuera BB)",
        met: false,
        pending: true,
      },
      {
        id: "puntoMedioCut",
        label: "Corte punto medio BB: omitido",
        met: false,
        pending: true,
      },
      {
        id: "cutsTrendReinforcement",
        label: "Corte de tendencia: omitido",
        met: false,
        pending: true,
      },
    ];
  }

  const volRule = resolveVolExpansionRule(checks);
  const volDetail = [volRule.detail, openingSlot].filter(Boolean).join(" · ") || undefined;

  return [
    openInsideRule,
    {
      ...volRule,
      detail: volDetail,
    },
    resolvePuntoMedioCutRule(checks),
    {
      id: "cutsTrendReinforcement",
      label: "Corte de tendencia",
      met: checks?.cutsTrendReinforcement ?? checks?.cutsOpposite2hTrend,
      detail:
        checks?.priorBb15MoveDirection && checks?.moveDirection
          ? `vs prior ${checks.priorBb15MoveDirection} → ${checks.moveDirection}`
          : undefined,
    },
  ];
}

export type Bb15DecisionTimingStatus = "good" | "probable" | "late" | "pending";

export type Bb15DecisionTimingView = {
  status: Bb15DecisionTimingStatus;
  label: string;
  className: string;
  title: string;
};

/** Minutes 9:30–9:45 ET for simulation replay. */
export const BB15_OPENING_VERIFY_START_MIN = 9 * 60 + 30;
export const BB15_OPENING_VERIFY_END_MIN = 9 * 60 + 45;

export const BB15_SIMULATION_MINUTES_ET: string[] = Array.from({ length: 16 }, (_, i) => {
  const total = BB15_OPENING_VERIFY_START_MIN + i;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${h}:${m.toString().padStart(2, "0")}`;
});

export function formatBb15MinutesHm(minutesEt: number): string {
  const h = Math.floor(minutesEt / 60);
  const m = minutesEt % 60;
  return `${h}:${m.toString().padStart(2, "0")}`;
}

export type Bb15NowWindow = "premarket" | "opening" | "after_opening";

export function resolveBb15NowWindow(now = new Date()): Bb15NowWindow {
  const minutes = minutesOfDayEt(now);
  if (!isTradingSessionDayEt(now) || minutes < BB15_OPENING_VERIFY_START_MIN) {
    return "premarket";
  }
  if (minutes <= BB15_OPENING_VERIFY_END_MIN) {
    return "opening";
  }
  return "after_opening";
}

export function resolveBb15ManualNowOptions(
  configSymbols: string[],
  now = new Date()
): {
  mode: "premarket_now" | "in_market_now" | "post_market_now";
  manual: true;
  fresh?: boolean;
  tradeDate?: string;
  simulateMinutesEt?: number;
  symbols?: string[];
  label: string;
} {
  const window = resolveBb15NowWindow(now);
  if (window === "premarket") {
    return {
      mode: "premarket_now",
      manual: true,
      tradeDate: effectiveTradingDateEt(now),
      symbols: configSymbols.length > 0 ? configSymbols : undefined,
      label: `${effectiveTradingDateEt(now)} premarket (top 5 probable)`,
    };
  }
  const params = resolveBb15NowVerifyParams(now);
  if (window === "opening") {
    return {
      mode: "in_market_now",
      manual: true,
      tradeDate: params.tradeDate,
      simulateMinutesEt: params.simulateMinutesEt,
      label: params.label,
    };
  }
  return {
    mode: "post_market_now",
    manual: true,
    fresh: true,
    tradeDate: params.tradeDate,
    simulateMinutesEt: params.simulateMinutesEt,
    label: params.label,
  };
}

export type Bb15NowVerifyParams = {
  tradeDate: string;
  simulateMinutesEt: number;
  label: string;
  inOpeningWindow: boolean;
};

/** Fresh verify at current ET minute in 9:30–9:45, else replay through 9:45 on last session (uses cached 1m archive like Test). */
export function resolveBb15NowVerifyParams(now = new Date()): Bb15NowVerifyParams {
  const tradeDate = effectiveTradingDateEt(now);
  const minutes = minutesOfDayEt(now);
  const inOpeningWindow =
    isTradingSessionDayEt(now) &&
    minutes >= BB15_OPENING_VERIFY_START_MIN &&
    minutes <= BB15_OPENING_VERIFY_END_MIN;

  if (inOpeningWindow) {
    return {
      tradeDate,
      simulateMinutesEt: minutes,
      label: `${tradeDate} ${formatBb15MinutesHm(minutes)} ET (now)`,
      inOpeningWindow: true,
    };
  }

  return {
    tradeDate,
    simulateMinutesEt: BB15_OPENING_VERIFY_END_MIN,
    label: `${tradeDate} 9:45 ET (ventana 9:30–9:45)`,
    inOpeningWindow: false,
  };
}

export function bb15MinutesEtToInt(hm: string): number {
  const [h, m] = hm.split(":").map((x) => parseInt(x, 10));
  return h * 60 + m;
}

export function resolveBb15DecisionTiming(
  row: FinanceAiBolinger15FastMovementTicker
): Bb15DecisionTimingView {
  const checks = row.opening?.checks ?? row.checks;
  const raw = (
    row.decisionTimingStatus ??
    checks?.decisionTimingStatus ??
    "pending"
  ).toLowerCase() as Bb15DecisionTimingStatus;

  const status: Bb15DecisionTimingStatus =
    raw === "good" || raw === "probable" || raw === "late" ? raw : "pending";

  const lastEt =
    row.decisionLastSignalEt ??
    checks?.decisionLastSignalEt ??
    checks?.simulationTimeEt;
  const deadline = checks?.decisionDeadlineEt ?? "9:40";

  const labels: Record<Bb15DecisionTimingStatus, string> = {
    good: "GOOD",
    probable: "PROBABLE",
    late: "LATE",
    pending: "PEND",
  };
  const classes: Record<Bb15DecisionTimingStatus, string> = {
    good: "text-green-700 bg-green-50 border-green-200",
    probable: "text-amber-700 bg-amber-50 border-amber-200",
    late: "text-red-700 bg-red-50 border-red-200",
    pending: "text-gray-500 bg-gray-50 border-gray-200",
  };

  const titleParts = [
    `Decisión: ${labels[status]}`,
    lastEt ? `última señal ${lastEt} ET` : undefined,
    `deadline ${deadline} ET`,
    row.simulationTimeEt ? `sim ${row.simulationTradeDate} ${row.simulationTimeEt}` : undefined,
    checks?.decisionEvalAfterDeadline ? "evaluación post 9:40" : undefined,
  ].filter(Boolean);

  return {
    status,
    label: labels[status],
    className: classes[status],
    title: titleParts.join(" · "),
  };
}

/** All four opening rules confirmed (matches collapsed ✓ icons — excludes probable / por cruzar). */
export function bb15AllCoreRulesConfirmed(
  row: FinanceAiBolinger15FastMovementTicker
): boolean {
  const checks = row.opening?.checks ?? row.checks;
  if (checks?.hourlyBbMidCrossOverride === true && wasBb15RulesEvaluated(row)) {
    return true;
  }
  if (checks?.openingGateFailed === true) return false;
  if (!wasBb15RulesEvaluated(row)) return false;
  const items = withPendingRules(resolveBb15CoreRules(row), true);
  const { met, total } = countBb15RulesFromItems(items);
  return total >= 4 && met >= 4;
}

export function isBb15StrategyMet(row: FinanceAiBolinger15FastMovementTicker): boolean {
  return bb15AllCoreRulesConfirmed(row);
}

const BB15_TIMING_SORT_RANK: Record<Bb15DecisionTimingStatus, number> = {
  good: 0,
  probable: 1,
  pending: 2,
  late: 3,
};

function bb15SignalSortRank(signal: string | undefined): number {
  switch (signal) {
    case "triggered":
      return 0;
    case "watch":
      return 1;
    case "confirmed":
      return 2;
    case "failed":
      return 3;
    default:
      return 4;
  }
}

/** Sort tickers: highest probability first, then rules met, timing, signal. */
export function compareBb15TickerRows(
  a: FinanceAiBolinger15FastMovementTicker,
  b: FinanceAiBolinger15FastMovementTicker
): number {
  const scoreA = Number(a.probabilityScore ?? a.premarketProbabilityScore ?? 0);
  const scoreB = Number(b.probabilityScore ?? b.premarketProbabilityScore ?? 0);
  if (scoreA !== scoreB) return scoreB - scoreA;

  const aEval = wasBb15RulesEvaluated(a);
  const bEval = wasBb15RulesEvaluated(b);
  if (aEval !== bEval) return aEval ? -1 : 1;

  const aHasData = hasBb15TickerSessionData(a);
  const bHasData = hasBb15TickerSessionData(b);
  if (aHasData !== bHasData) return aHasData ? -1 : 1;

  const aRules = resolveBb15RulesMet(a);
  const bRules = resolveBb15RulesMet(b);
  if (aRules.met !== bRules.met) return bRules.met - aRules.met;
  if (aRules.total !== bRules.total) return bRules.total - aRules.total;

  const ta = resolveBb15DecisionTiming(a).status;
  const tb = resolveBb15DecisionTiming(b).status;
  const timingDiff = BB15_TIMING_SORT_RANK[ta] - BB15_TIMING_SORT_RANK[tb];
  if (timingDiff !== 0) return timingDiff;

  const aSignal = resolveBb15TickerSignal(a).signal;
  const bSignal = resolveBb15TickerSignal(b).signal;
  const signalDiff = bb15SignalSortRank(aSignal) - bb15SignalSortRank(bSignal);
  if (signalDiff !== 0) return signalDiff;

  return (a.symbol ?? "").localeCompare(b.symbol ?? "");
}

export function partitionBb15TickerRows(
  rows: FinanceAiBolinger15FastMovementTicker[]
): {
  met: FinanceAiBolinger15FastMovementTicker[];
  notMet: FinanceAiBolinger15FastMovementTicker[];
} {
  const met = rows.filter(isBb15StrategyMet).sort(compareBb15TickerRows);
  const notMet = rows.filter((r) => !isBb15StrategyMet(r)).sort(compareBb15TickerRows);
  return { met, notMet };
}

export function resolveBb15RulesGrouped(
  row: FinanceAiBolinger15FastMovementTicker
): { met: Bb15RuleItem[]; notMet: Bb15RuleItem[] } {
  const panel = resolveBb15RulesPanel(row);
  const met: Bb15RuleItem[] = [];
  const notMet: Bb15RuleItem[] = [];
  for (const rule of panel.items) {
    if (rule.met === true) {
      met.push(rule);
    } else {
      notMet.push(rule);
    }
  }
  return { met, notMet };
}

/** Opening-window rules — must match backend _count_opening_rules_met (3 flags). */
function formatBb15VolExpansionDetail(
  checks: FinanceAiBolinger15FastMovementTicker["checks"] | undefined
): string | undefined {
  const parts: string[] = [];
  const ratio = checks?.volExpansionVsPremarketRatio ?? checks?.volExpansionRatio;
  if (ratio != null) parts.push(`×${ratio}`);
  const direction = checks?.volExpansionDirection ?? checks?.moveDirection;
  if (direction && direction !== "flat") parts.push(String(direction));
  if (checks?.volBandDirectionOk === true) {
    parts.push(direction === "down" ? "boca BB abajo" : "boca BB arriba");
  }
  if (checks?.bbReference?.includes("regular") || checks?.bbReference?.includes("bell")) {
    parts.push("BB regular session");
  } else if (checks?.bbReference?.includes("forming")) {
    parts.push("BB forming 9:30–9:45");
  }
  return parts.length > 0 ? parts.join(" · ") : undefined;
}

function formatBb15OpeningBarDetail(
  checks: FinanceAiBolinger15FastMovementTicker["checks"] | undefined
): string | undefined {
  const slot = checks?.openingBarSlot;
  return slot ? `vela ${slot}` : undefined;
}

export function resolveBb15OpeningRules(
  row: FinanceAiBolinger15FastMovementTicker,
  _checks?: FinanceAiBolinger15FastMovementTicker["checks"],
  _eod?: FinanceAiBolinger15FastMovementTicker["eodSetup"]
): Bb15RuleItem[] {
  return resolveBb15CoreRules(row);
}

export function wasBb15RulesEvaluated(row: FinanceAiBolinger15FastMovementTicker): boolean {
  const checks = row.opening?.checks ?? row.checks;
  if (!checks) return false;
  return (
    checks.volExpandedAfterPremarket !== undefined ||
    checks.opensInsideBb15m !== undefined ||
    checks.insideBb15m !== undefined ||
    checks.cutsBbMiddle !== undefined ||
    checks.cutsPending !== undefined ||
    checks.puntoMedioCutConfirmed !== undefined
  );
}

/** @deprecated Use wasBb15RulesEvaluated */
export function wasBb15LastCheckEvaluated(row: FinanceAiBolinger15FastMovementTicker): boolean {
  return wasBb15RulesEvaluated(row);
}

export function formatBb15RulesSectionLabel(
  row: FinanceAiBolinger15FastMovementTicker
): string {
  if (row.simulationTimeEt && row.simulationTradeDate) {
    return `BB15 — apertura (sim ${row.simulationTradeDate} ${row.simulationTimeEt} ET)`;
  }
  if (row.assessmentSource === "simulation" && row.checks?.simulationTimeEt) {
    return `BB15 — apertura (sim ${row.checks.simulationTimeEt} ET)`;
  }
  if (row.validation10am?.evaluatedAtEt === "10:00" && row.assessmentSource !== "simulation") {
    return "BB15 — apertura (10:00 AM ET)";
  }
  const manual = formatBb15ManualAssessmentEt(row.manualAssessmentAt ?? row.lastAssessmentAt);
  if (manual) {
    return `BB15 — apertura (${manual} ET)`;
  }
  if (row.validation10am?.evaluatedAtEt) {
    return `BB15 — apertura (${row.validation10am.evaluatedAtEt} ET)`;
  }
  return "BB15 — apertura (9:30 / 9:45 ET)";
}

export function formatBb15ExcludeReason(reason: string | undefined): string {
  const map: Record<string, string> = {
    eod_setup_failed: "Vol ayer no parcialmente cerrada (setup EOD falló)",
    eod_vol_not_partially_closed: "Vol ayer no parcialmente cerrada",
    no_ticker_context: "Sin ticker context — ejecutar Inicializar",
    ticker_context_not_ready: "TickerContext no listo — revisar Inicializar",
    no_assessment_base: "Sin foundation PRE (1:00) — Recopilar con eval",
    daily_maintenance_stale: "Mantenimiento 1:00 no corrido hoy",
    daily_maintenance_failed: "Mantenimiento 1:00 falló",
    daily_maintenance_running: "Mantenimiento 1:00 en curso",
    no_min15_bars: "Sin barras 15M en archivo",
    no_prior_day: "Sin día anterior en 15M",
    not_precheck_candidate: "No pasó vol precheck 9:28",
    no_prior_close: "Sin cierre día anterior",
    no_premarket_price: "Sin precio premarket",
    insufficient_prior_bars: "Barras 15M insuficientes ayer (mín. 20)",
  };
  if (!reason) return "Excluido del scan";
  return map[reason] ?? reason.replace(/_/g, " ");
}

/** @deprecated Use formatBb15RulesSectionLabel */
export function formatBb15LastCheckSectionLabel(
  row: FinanceAiBolinger15FastMovementTicker
): string {
  return formatBb15RulesSectionLabel(row);
}

export type Bb15ChecksProgressSegment = {
  key: "rules";
  label: string;
  items: Bb15RuleItem[];
  pending: boolean;
  met: number;
  total: number;
};

export type Bb15ChecksProgressView = {
  segments: Bb15ChecksProgressSegment[];
};

/** Compact check progress for collapsed ticker header. */
export function resolveBb15ChecksProgress(
  row: FinanceAiBolinger15FastMovementTicker
): Bb15ChecksProgressView | null {
  const panel = resolveBb15RulesPanel(row);
  const hasData =
    !panel.pending ||
    row.opening?.checks != null ||
    row.checks?.volExpandedAfterPremarket != null ||
    row.manualAssessmentAt != null ||
    row.precheck928 != null;

  if (!hasData) {
    return null;
  }

  const items = panel.pending ? [] : panel.items;
  return {
    segments: [
      {
        key: "rules",
        label: "BB15",
        items,
        pending: panel.pending,
        met: panel.met,
        total: panel.total,
      },
    ],
  };
}

export type Bb15CollapsedTickerBadge = {
  pct: number | null;
  premarketLabel: string;
  lastCheckLabel: string | null;
  /** e.g. "50% - 9:28 | Last 11:22" */
  progressLine: string;
};

export function formatBb15TimeHm24(iso: string | undefined): string | null {
  if (!iso) return null;
  const when = new Date(iso);
  if (Number.isNaN(when.getTime())) return null;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: ET,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(when);
}

function resolveBb15LastCheckTimeHm(row: FinanceAiBolinger15FastMovementTicker): string | null {
  if (row.validation10am?.evaluatedAtEt === "10:00") {
    return "10:00";
  }
  if (row.validation10am?.evaluatedAtEt) {
    return row.validation10am.evaluatedAtEt;
  }
  return formatBb15TimeHm24(row.manualAssessmentAt ?? row.lastAssessmentAt);
}

/** Collapsed ticker line: rounded % + assessment time */
export function resolveBb15CollapsedTickerBadge(
  row: FinanceAiBolinger15FastMovementTicker
): Bb15CollapsedTickerBadge | null {
  const panel = resolveBb15RulesPanel(row);
  const progress = resolveBb15ChecksProgress(row);
  if (!progress || progress.segments.length === 0) {
    return null;
  }

  const pct =
    panel.pending || panel.total <= 0
      ? null
      : Math.round((panel.met / panel.total) * 100);
  const time = resolveBb15LastCheckTimeHm(row);
  const pctText = pct != null ? `${pct}%` : "—";
  const timeLabel = panel.pending ? "pendiente" : time ? time : "BB15";
  const progressLine = `${pctText} - ${timeLabel}`;

  return {
    pct,
    premarketLabel: timeLabel,
    lastCheckLabel: null,
    progressLine,
  };
}

export type Bb15RulesPanelView = {
  label: string;
  met: number;
  total: number;
  items: Bb15RuleItem[];
  pending: boolean;
};

export type Bb15RulesScoreView = {
  met: number;
  total: number;
  pct: number | null;
  pending: boolean;
  label: string;
  shortLabel: string;
  /** Last Check — counts without percentage. */
  summaryLabel?: string;
  usePercentage?: boolean;
};

export type Bb15ScoreColorStyle = {
  stroke: string;
  fill: string;
  text: string;
  track: string;
};

/** Percentage score from rules met/total; null when pending or no total. */
export function resolveBb15RulesScore(
  met: number,
  total: number,
  pending?: boolean
): Pick<Bb15RulesScoreView, "met" | "total" | "pct" | "pending"> {
  if (pending || total <= 0) {
    return { met, total, pct: null, pending: Boolean(pending) };
  }
  const pct = Math.round((Math.max(0, met) / total) * 100);
  return { met, total, pct, pending: false };
}

/** Bubble colors by score band (pending = gray). */
export function resolveBb15ScoreColorStyle(
  pct: number | null,
  pending?: boolean
): Bb15ScoreColorStyle {
  if (pending || pct == null) {
    return {
      stroke: "#94a3b8",
      fill: "#f1f5f9",
      text: "text-slate-500",
      track: "#e2e8f0",
    };
  }
  if (pct >= 80) {
    return {
      stroke: "#16a34a",
      fill: "#dcfce7",
      text: "text-green-700",
      track: "#bbf7d0",
    };
  }
  if (pct >= 50) {
    return {
      stroke: "#d97706",
      fill: "#fef3c7",
      text: "text-amber-700",
      track: "#fde68a",
    };
  }
  return {
    stroke: "#dc2626",
    fill: "#fee2e2",
    text: "text-red-700",
    track: "#fecaca",
  };
}

/** Which check was calculated most recently for this ticker. */
export function resolveBb15LatestScoreSection(
  row: FinanceAiBolinger15FastMovementTicker
): "rules" | null {
  return wasBb15RulesEvaluated(row) ? "rules" : null;
}

export function resolveBb15RulesScoreView(
  row: FinanceAiBolinger15FastMovementTicker
): Bb15RulesScoreView {
  const panel = resolveBb15RulesPanel(row);
  const score = resolveBb15RulesScore(panel.met, panel.total, panel.pending);
  return {
    ...score,
    label: panel.label,
    shortLabel: `${panel.met}/${panel.total}`,
    usePercentage: true,
  };
}

/** @deprecated Use resolveBb15RulesScoreView */
export function resolveBb15RulesScoreViews(row: FinanceAiBolinger15FastMovementTicker): {
  premarket: Bb15RulesScoreView;
  now: Bb15RulesScoreView;
  latest: Bb15RulesScoreView | null;
  latestSection: "rules" | null;
} {
  const score = resolveBb15RulesScoreView(row);
  return {
    premarket: score,
    now: score,
    latest: wasBb15RulesEvaluated(row) ? score : null,
    latestSection: resolveBb15LatestScoreSection(row),
  };
}

export function resolveBb15RulesPanel(
  row: FinanceAiBolinger15FastMovementTicker
): Bb15RulesPanelView {
  const evaluated = wasBb15RulesEvaluated(row);
  const items = withPendingRules(resolveBb15CoreRules(row), evaluated);
  const counts = countBb15RulesFromItems(items);
  const backendMet = row.rulesMet ?? row.opening?.checks?.rulesMet ?? row.checks?.rulesMet;
  const backendTotal = row.rulesTotal ?? row.opening?.checks?.rulesTotal ?? row.checks?.rulesTotal;

  return {
    label: formatBb15RulesSectionLabel(row),
    met: evaluated ? counts.met : (backendMet ?? counts.met),
    total: evaluated ? counts.total : (backendTotal ?? counts.total ?? 4),
    items,
    pending: !evaluated,
  };
}

/** Mirror backend _count_opening_rules_met — includes probable/aboutToCross as not met. */
export function countBb15RulesFromItems(rules: Bb15RuleItem[]): Bb15RulesView {
  const countable = rules.filter((r) => !r.pending && !r.probable && !r.aboutToCross);
  const pendingCount = rules.filter((r) => r.pending).length;
  return {
    met: countable.filter((r) => r.met === true).length,
    total: countable.length > 0 ? countable.length : pendingCount || rules.length,
  };
}

export function resolveBb15RulesMet(row: FinanceAiBolinger15FastMovementTicker): Bb15RulesView {
  if (wasBb15RulesEvaluated(row)) {
    return countBb15RulesFromItems(
      withPendingRules(resolveBb15CoreRules(row), true)
    );
  }

  const backendMet =
    row.rulesMet ??
    row.validation10am?.rulesMet ??
    row.opening?.checks?.rulesMet ??
    row.checks?.rulesMet;
  const backendTotal =
    row.rulesTotal ??
    row.validation10am?.rulesTotal ??
    row.opening?.checks?.rulesTotal ??
    row.checks?.rulesTotal;

  if (backendMet != null && backendTotal != null) {
    return { met: backendMet, total: backendTotal };
  }

  return countBb15RulesFromItems(resolveBb15CoreRules(row));
}

/** Movimientos -15M results — for now show all tickers (no ≥2/4 gate). */
export function bb15TickerVisibleInList(_row: FinanceAiBolinger15FastMovementTicker): boolean {
  return true;
}

export type Bb15BollingerPlacement = "inside" | "outside";

/** Open @ 9:30 bell inside regular BB15 — false when gate failed (outside). */
export function bb15TickerOpensInsideBollinger(
  row: FinanceAiBolinger15FastMovementTicker
): boolean | null {
  const checks = row.opening?.checks ?? row.checks;
  if (!checks) return null;
  if (checks.openingGateFailed === true) return false;
  const inside = checks.opensInsideBb15m ?? checks.insideBb15m;
  if (inside === true) return true;
  if (inside === false) return false;
  return null;
}

export function bb15TickerMatchesPlacement(
  row: FinanceAiBolinger15FastMovementTicker,
  placement: Bb15BollingerPlacement
): boolean {
  const inside = bb15TickerOpensInsideBollinger(row);
  if (inside == null) return false;
  return placement === "inside" ? inside : !inside;
}

export function isBb15PrecheckPhase(row: FinanceAiBolinger15FastMovementTicker): boolean {
  const opening = row.opening;
  const hasOpeningChecks =
    Boolean(opening?.checks?.opensInsideBb15m != null || opening?.checks?.cutsPriorClose != null);
  return !hasOpeningChecks && Boolean(row.precheck928?.checks || row.checks?.volAyerClosed != null);
}

export type Bb15PredictionView = {
  outcome: string | undefined;
  label: string;
  className: string;
  met?: boolean;
  movePct?: number;
  predictedDirection?: string;
  tooltipTitle: string;
  tooltipLines: string[];
  evaluated: boolean;
};

type Bb15BarSnapshot = {
  datetime?: string;
  open?: number;
  close?: number;
  high?: number;
  low?: number;
};

function formatValidationBar(label: string, bar: Bb15BarSnapshot | undefined): string {
  if (!bar || bar.open == null || bar.close == null) {
    return `${label}: —`;
  }
  const time = bar.datetime?.split(" ")[1]?.slice(0, 5) ?? label;
  const dir = bar.close >= bar.open ? "↑" : "↓";
  return `${time} · O ${bar.open} → C ${bar.close} ${dir}`;
}

function formatPredictedDir(dir: string | undefined): string {
  const d = (dir ?? "").toLowerCase();
  if (d === "up") return "UP (CALL)";
  if (d === "down") return "DOWN (PUT)";
  return "—";
}

export function resolveBb15Prediction(row: FinanceAiBolinger15FastMovementTicker): Bb15PredictionView {
  const validation = row.validation10am;
  const opening = row.opening;
  const checks = opening?.checks ?? row.checks;
  const rulesMet = checks?.rulesMet ?? row.rulesMet;
  const rulesTotal = checks?.rulesTotal ?? row.rulesTotal;
  const firstCandleEntry =
    row.entryReady === true || (rulesMet === rulesTotal && rulesTotal === 3);
  const entrySlot = row.entryBarSlot ?? checks?.openingBarSlot ?? "9:30";

  if (firstCandleEntry) {
    const dir = opening?.direction ?? row.direction ?? checks?.moveDirection;
    const dirLabel = dir === "up" ? "UP" : dir === "down" ? "DOWN" : "—";
    return {
      outcome: "confirmed",
      label: `Entrada vela ${entrySlot} ✓`,
      className: "text-green-700 font-semibold",
      met: true,
      predictedDirection: dir,
      tooltipTitle: `Entrada 1ª vela 15m (${entrySlot} ET)`,
      tooltipLines: [
        "Entrada cuando 3/3 reglas en la 1ª vela — no se espera 9:45",
        `Dirección: ${dirLabel}`,
        `Reglas: ${rulesMet}/${rulesTotal}`,
      ],
      evaluated: true,
    };
  }

  const outcome = row.predictionOutcome ?? validation?.outcome;
  const predictedDirection = validation?.predictedDirection ?? opening?.direction ?? row.direction;
  const movePct = validation?.closeVsPriorClosePct;
  const priorClose = row.eodSetup?.priorClose ?? row.precheck928?.priorClose;

  const lastCheckTime =
    validation?.evaluatedAtEt === "10:00"
      ? "10:00 AM ET"
      : formatBb15ManualAssessmentEt(row.manualAssessmentAt ?? row.lastAssessmentAt);

  const tooltipLines: string[] = [
    "Seguimiento opcional 10:00 ET (no bloquea entrada en 1ª vela)",
  ];
  if (lastCheckTime) {
    tooltipLines.unshift(`Last check: ${lastCheckTime}`);
  }

  if (predictedDirection) {
    tooltipLines.push(`Predicted: ${formatPredictedDir(predictedDirection)}`);
  }
  if (priorClose != null) {
    tooltipLines.push(`Prior close: ${priorClose}`);
  }

  if (validation?.bar1 || validation?.bar2) {
    tooltipLines.push(formatValidationBar("Bar 1", validation.bar1));
    tooltipLines.push(formatValidationBar("Bar 2", validation.bar2));
  } else if (validation?.barsAvailable != null) {
    tooltipLines.push(`Bars available: ${validation.barsAvailable}/2`);
  }

  if (validation?.directionOk != null) {
    tooltipLines.push(
      validation.directionOk
        ? "✓ Direction vs prior close — met"
        : "○ Direction vs prior close — not met"
    );
  }
  if (validation?.momentumOk != null) {
    tooltipLines.push(
      validation.momentumOk
        ? "✓ Momentum 1ª vela — met"
        : "○ Momentum 1ª vela — not met"
    );
  }
  if (movePct != null) {
    tooltipLines.push(
      `9:45 close vs prior close: ${movePct > 0 ? "+" : ""}${movePct}%`
    );
  }
  if (validation?.summary) {
    tooltipLines.push(validation.summary);
  }

  if (outcome === "confirmed") {
    tooltipLines.push("Conclusion: prediction met");
    return {
      outcome,
      label: "Met ✓",
      className: "text-green-700 font-semibold",
      met: true,
      movePct,
      predictedDirection,
      tooltipTitle: lastCheckTime ? `Last Check ${lastCheckTime} — met` : "Last Check — prediction met",
      tooltipLines,
      evaluated: true,
    };
  }
  if (outcome === "failed") {
    tooltipLines.push("Conclusion: prediction not met");
    return {
      outcome,
      label: "Not met ✗",
      className: "text-red-600 font-semibold",
      met: false,
      movePct,
      predictedDirection,
      tooltipTitle: lastCheckTime ? `Last Check ${lastCheckTime} — not met` : "Last Check — prediction not met",
      tooltipLines,
      evaluated: true,
    };
  }
  if (outcome === "pending") {
    const reason =
      validation?.reason === "waiting_second_bar"
        ? "Seguimiento 10:00 pendiente (entrada no depende de 9:45)"
        : validation?.reason ?? "Pendiente";
    tooltipLines.push(`Estado: ${reason}`);
    return {
      outcome,
      label: "Sin entrada (reglas incompletas)",
      className: "text-amber-700 font-medium",
      movePct,
      predictedDirection,
      tooltipTitle: "Apertura — sin entrada aún",
      tooltipLines,
      evaluated: false,
    };
  }
  if (outcome === "no_prediction") {
    tooltipLines.push("Status: no predicted direction at open");
    return {
      outcome,
      label: "— no prediction",
      className: "text-gray-400",
      tooltipTitle: "Last Check",
      tooltipLines,
      evaluated: false,
    };
  }

  const { signal } = resolveBb15TickerSignal(row);
  if (signal === "triggered" || signal === "watch") {
    tooltipLines.push("Monitoreando 1ª vela 15m (9:30–9:40 ET)");
    return {
      outcome: undefined,
      label: signal === "triggered" ? "Entrada vela 9:30" : "Watch apertura",
      className: signal === "triggered" ? "text-green-700 font-semibold" : "text-gray-500",
      predictedDirection: row.direction ?? row.precheck928?.expectedDirection,
      tooltipTitle: "Apertura — 1ª vela 15m",
      tooltipLines,
      evaluated: signal === "triggered",
    };
  }

  return {
    outcome: undefined,
    label: "—",
    className: "text-gray-400",
    tooltipTitle: "Apertura",
    tooltipLines: ["Entrada en 1ª vela 15m cuando 3/3 reglas"],
    evaluated: false,
  };
}

export function bb15DirectionLabel(dir: string | undefined): string {
  const d = (dir ?? "").toLowerCase();
  if (d === "up") return "↑ CALL";
  if (d === "down") return "↓ PUT";
  return "—";
}

export function bb15SignalLabel(signal: string | undefined): string {
  if (signal === "triggered") return "TRIGGER";
  if (signal === "watch") return "WATCH";
  if (signal === "confirmed") return "CONFIRM";
  if (signal === "failed") return "FALLÓ";
  return "—";
}

export function hasBb15TickerSessionData(
  row: FinanceAiBolinger15FastMovementTicker
): boolean {
  return Boolean(
    row.precheck928?.checks ||
      row.precheck928?.rulesMet != null ||
      row.opening?.checks ||
      row.validation10am ||
      row.lastRunAt ||
      row.lastAssessmentAt ||
      row.manualAssessmentAt ||
      row.lastAssessmentPhase === "full_assessment" ||
      row.lastAssessmentPhase === "full_assessment_inside_b15m" ||
      row.lastAssessmentPhase === "in_market_now" ||
      row.lastAssessmentPhase === "post_market_now" ||
      row.assessmentSource === "manual" ||
      row.eodSetup?.passed != null ||
      row.excluded != null ||
      row.checks?.volAyerClosed != null ||
      row.checks?.opensInsideBb15m != null
  );
}

export function hasBb15SessionResults(
  status: FinanceAiBolinger15FastMovementStatus | null | undefined
): boolean {
  if (!status) return false;
  if (status.hasSessionResults) return true;
  if (status.sessionFinalAt || status.lastRunAt) return true;
  const tickers = status.tickers ?? {};
  return Object.values(tickers).some((row) => hasBb15TickerSessionData(row));
}

export function formatBb15ManualAssessmentEt(
  iso: string | undefined
): string | null {
  if (!iso) return null;
  const when = new Date(iso);
  if (Number.isNaN(when.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: ET,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(when);
}

function formatBb15TimeEt(iso: string | undefined): string | null {
  return formatBb15ManualAssessmentEt(iso);
}

const BB15_ASSESSMENT_LABEL: Record<string, string> = {
  precheck_928: "Precheck 9:28",
  opening_poll: "Apertura 9:31–9:40",
  validation_10am: "Validación 10:00",
  full_assessment: "Recálculo completo",
  full_assessment_fresh: "Recálculo fresh (Schwab → Dynamo)",
  full_assessment_inside_b15m: "Inside BB15 — 1m + precheck + estrategia",
  in_market_now: "In-market Now — pool o universo 15M",
  post_market_now: "Post-market Now — pool TickersToday15M",
  premarket_now: "Premarket — top 5 probable",
  eod_screen: "Screen EOD",
  session_complete: "Sesión completa",
  idle: "Sin evaluación",
};

/** Human label for the 15M bar window used in the assessment. */
export function resolveBb15DataWindowLabel(
  phase: string | undefined,
  slots?: FinanceAiBolinger15FastMovementTicker["min15DataSlots"]
): string {
  const slotNames = (slots ?? []).map((s) => s.slot).filter(Boolean);
  if (slotNames.includes("check_1000")) {
    return "velas 15M 9:30 ET (1ª vela — entrada)";
  }
  if (slotNames.includes("check_live")) {
    return "velas 15M 9:31–9:40 ET (apertura en vivo)";
  }
  if (slotNames.includes("precheck_928")) {
    return "velas 15M 8:30–9:15 ET (hora premarket)";
  }
  switch (phase) {
    case "precheck_928":
      return "velas 15M 8:30–9:15 ET (hora premarket)";
    case "opening_poll":
      return "velas 15M 9:31–9:40 ET (apertura en vivo)";
    case "validation_10am":
      return "velas 15M 9:30 ET (1ª vela — entrada)";
    case "full_assessment":
      return "velas 8:30–9:15 ET + 9:30–10:00 ET";
    default:
      return "velas 15M del día";
  }
}

function resolveBb15AssessmentLabel(phase: string | undefined): string {
  return BB15_ASSESSMENT_LABEL[phase ?? ""] ?? (phase ? phase.replace(/_/g, " ") : "Evaluación");
}

function pickBb15ScheduledReferenceTicker(
  status: FinanceAiBolinger15FastMovementStatus | null | undefined
): FinanceAiBolinger15FastMovementTicker | undefined {
  const tickers = Object.values(status?.tickers ?? {});
  if (!tickers.length) return undefined;
  return (
    tickers.find((t) => hasBb15TickerSessionData(t) && t.assessmentSource !== "manual") ??
    tickers.find((t) => hasBb15TickerSessionData(t)) ??
    tickers[0]
  );
}

/** Scheduled / last automatic assessment tied to its data window. */
export function formatBb15ScheduledAssessmentLine(
  status: FinanceAiBolinger15FastMovementStatus | null | undefined
): string | null {
  if (!status) return null;

  const iso = status.sessionFinalAt ?? status.lastRunAt ?? status.updatedAt;
  if (!iso) return null;

  const time = formatBb15TimeEt(iso);
  if (!time) return null;

  const phase = status.lastRunPhase ?? status.phase ?? status.currentPhase;
  const ref = pickBb15ScheduledReferenceTicker(status);
  const assessment = resolveBb15AssessmentLabel(phase);
  const dataWindow = resolveBb15DataWindowLabel(phase, ref?.min15DataSlots);

  const rulesHint =
    ref?.rulesMet != null && ref.rulesTotal != null
      ? ` · ${ref.rulesMet}/${ref.rulesTotal} reglas`
      : ref?.validation10am?.outcome != null
        ? ` · validación ${ref.validation10am.outcome}`
        : "";

  const source =
    status.sessionFinalAt || status.sessionFinalEt ? "Programada" : "Última corrida";

  return `${source}: ${assessment} · ${dataWindow}${rulesHint} · ${time} ET`;
}

/** Manual Verificar — assessment time + data window it recalculated. */
export function formatBb15ManualAssessmentLine(
  status: FinanceAiBolinger15FastMovementStatus | null | undefined
): string | null {
  if (!status?.tickers) return null;

  const manualRow = Object.values(status.tickers).find(
    (t) => t.manualAssessmentAt || t.assessmentSource === "manual"
  );
  if (!manualRow?.manualAssessmentAt) return null;

  const time = formatBb15TimeEt(manualRow.manualAssessmentAt);
  if (!time) return null;

  const phase = manualRow.lastAssessmentPhase ?? manualRow.lastPhase ?? "full_assessment";
  const assessment = resolveBb15AssessmentLabel(phase);
  const dataWindow = resolveBb15DataWindowLabel(phase, manualRow.min15DataSlots);

  return `Verificar: ${assessment} · ${dataWindow} · ${time} ET`;
}

export function formatBb15LastUpdateEt(
  status: FinanceAiBolinger15FastMovementStatus | null | undefined
): string | null {
  return formatBb15ScheduledAssessmentLine(status);
}

export function resolveBb15ScheduledCompareLines(
  row: FinanceAiBolinger15FastMovementTicker
): string[] {
  if (row.assessmentSource !== "manual") return [];
  const lines: string[] = [];
  const schedVal = row.validation10amScheduled?.outcome;
  const manualVal = row.validation10am?.outcome ?? row.predictionOutcome;
  if (schedVal && manualVal && schedVal !== manualVal) {
    lines.push(`10:00 check: scheduled ${schedVal} → manual ${manualVal}`);
  } else if (schedVal && manualVal) {
    lines.push(`10:00 check: scheduled & manual both ${manualVal}`);
  }
  const schedDir = row.openingScheduled?.direction ?? row.precheck928Scheduled?.expectedDirection;
  const manualDir = row.opening?.direction ?? row.precheck928?.expectedDirection ?? row.direction;
  if (schedDir && manualDir && schedDir !== manualDir) {
    lines.push(`Direction: scheduled ${String(schedDir).toUpperCase()} → manual ${String(manualDir).toUpperCase()}`);
  }
  const schedPre = row.precheck928Scheduled?.rulesMet;
  const manualPre = row.precheck928?.rulesMet;
  if (schedPre != null && manualPre != null && schedPre !== manualPre) {
    lines.push(`9:28 rules: scheduled ${schedPre} → manual ${manualPre}`);
  }
  return lines;
}
