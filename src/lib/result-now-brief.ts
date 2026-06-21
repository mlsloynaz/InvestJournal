import type {
  FinanceAiCalendarGate,
  FinanceAiNewsSentiment,
  FinanceAiPanoramaCompleto,
  FinanceAiPremarketAnalysis,
  FinanceAiStrategyFit,
} from "@/lib/finance-ai-types";
import { filterStrategyFits, RESULT_NOW_FOCUS_STRATEGY_IDS } from "@/lib/strategy-display";

export type BriefCheckLine = {
  ok: boolean;
  label: string;
  detail: string;
};

export type StrategyExitLevels = {
  direction: "CALL" | "PUT";
  targetLabel: string;
  targetPrice?: number;
  targetDistancePct?: number;
  stopLabel: string;
  stopPrice?: number;
  horizonNote: string;
};

function pickNearestAbove(price: number | null | undefined, levels: number[]): number | undefined {
  if (price == null || !levels.length) return undefined;
  const above = levels.filter((l) => l > price);
  if (!above.length) return undefined;
  return Math.min(...above);
}

function pickNearestBelow(price: number | null | undefined, levels: number[]): number | undefined {
  if (price == null || !levels.length) return undefined;
  const below = levels.filter((l) => l < price);
  if (!below.length) return undefined;
  return Math.max(...below);
}

function pctToLevel(
  price: number,
  level: number | undefined,
  direction: "up" | "down"
): number | undefined {
  if (level == null || price <= 0) return undefined;
  if (direction === "up" && level <= price) return undefined;
  if (direction === "down" && level >= price) return undefined;
  return (Math.abs(level - price) / price) * 100;
}

export function resolveFocusStrategyDirection(
  strategies: FinanceAiStrategyFit[] | undefined,
  strategyIds: readonly string[] = RESULT_NOW_FOCUS_STRATEGY_IDS
): "CALL" | "PUT" | null {
  const focus = filterStrategyFits(strategies, strategyIds)[0];
  const dir = focus?.direction?.trim().toUpperCase();
  if (dir === "CALL" || dir === "PUT") return dir;
  return null;
}

export function calendarBriefCheck(gate?: FinanceAiCalendarGate | null): BriefCheckLine | null {
  if (!gate) return null;
  if (gate.doNotTrade) {
    const blocked = (gate.checklist ?? []).find((item) => item.status === "blocked");
    const detail =
      blocked?.label ??
      gate.doNotTradeReasons?.[0] ??
      "FOMC o earnings hoy";
    return { ok: false, label: "Calendario", detail };
  }
  return { ok: true, label: "Calendario", detail: "OK" };
}

export function newsBriefCheck(
  news?: FinanceAiNewsSentiment | null,
  direction?: "CALL" | "PUT" | null
): BriefCheckLine | null {
  if (!news) {
    return { ok: false, label: "News", detail: "sin datos" };
  }
  if (news.skipped) {
    return { ok: false, label: "News", detail: news.skipReason ?? "omitido" };
  }
  if ((news.count ?? 0) === 0) {
    return { ok: false, label: "News", detail: "sin artículos" };
  }
  const score = news.averageScore ?? 0;
  let ok = true;
  let detail = `${news.count} art · score ${score.toFixed(2)}`;
  if (direction === "CALL" && score < -0.15) {
    ok = false;
    detail += " · en contra CALL";
  }
  if (direction === "PUT" && score > 0.15) {
    ok = false;
    detail += " · en contra PUT";
  }
  if (news.freshForToday === false) {
    ok = false;
    detail += " · no actualizado hoy";
  }
  return { ok, label: "News", detail };
}

export function resolveReferencePrice(panorama?: FinanceAiPanoramaCompleto | null): number | undefined {
  const m15 = panorama?.timeframes?.["15m"]?.close;
  if (m15 != null) return Number(m15);
  const h1 = panorama?.timeframes?.["1h"]?.close;
  if (h1 != null) return Number(h1);
  const edge = panorama?.edgeLines?.referencePrice;
  if (edge != null) return Number(edge);
  return undefined;
}

export function strategyExitLevels(
  direction: "CALL" | "PUT",
  panorama?: FinanceAiPanoramaCompleto | null,
  keyLevels?: { support?: number[]; resistance?: number[] } | null,
  refPrice?: number | null
): StrategyExitLevels | null {
  const price = refPrice ?? resolveReferencePrice(panorama);
  if (price == null || price <= 0) return null;

  const h1 = panorama?.timeframes?.["1h"];
  let support = h1?.nearestSupport;
  let resistance = h1?.nearestResistance;

  const structSupport = panorama?.structural?.support ?? keyLevels?.support ?? [];
  const structResistance = panorama?.structural?.resistance ?? keyLevels?.resistance ?? [];
  if (support == null) support = pickNearestBelow(price, structSupport);
  if (resistance == null) resistance = pickNearestAbove(price, structResistance);

  const hourly = panorama?.edgeLines?.hourly;
  if (resistance == null && hourly?.nearestHighs?.length) {
    resistance = pickNearestAbove(price, hourly.nearestHighs);
  }
  if (support == null && hourly?.nearestLows?.length) {
    support = pickNearestBelow(price, hourly.nearestLows);
  }

  if (direction === "PUT") {
    const targetPct = pctToLevel(price, support, "down");
    return {
      direction: "PUT",
      targetLabel: "Soporte (objetivo)",
      targetPrice: support,
      targetDistancePct: targetPct,
      stopLabel: "Resistencia (techo)",
      stopPrice: resistance,
      horizonNote:
        targetPct != null
          ? `~${targetPct.toFixed(1)}% al soporte — guía salida PUT`
          : "Soporte define alcance del movimiento",
    };
  }

  const targetPct = pctToLevel(price, resistance, "up");
  return {
    direction: "CALL",
    targetLabel: "Resistencia (objetivo)",
    targetPrice: resistance,
    targetDistancePct: targetPct,
    stopLabel: "Soporte (suelo)",
    stopPrice: support,
    horizonNote:
      targetPct != null
        ? `~${targetPct.toFixed(1)}% a resistencia — guía salida CALL`
        : "Resistencia define alcance del movimiento",
  };
}

export function panoramaFromAnalysis(
  analysis?: FinanceAiPremarketAnalysis | null
): FinanceAiPanoramaCompleto | null | undefined {
  if (!analysis) return null;
  return (
    analysis.panoramaCompleto ??
    analysis.marketFoundation?.panoramaCompleto ??
    analysis.strategyChecklist?.panoramaCompleto
  );
}
