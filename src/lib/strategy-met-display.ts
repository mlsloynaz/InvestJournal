import type { FinanceAiStrategyMetEval, FinanceAiStrategyMetWindow } from "@/lib/finance-ai-types";



export function formatMinutesEtLabel(minutes: number | undefined | null): string {

  if (minutes == null || !Number.isFinite(minutes)) return "—";

  const h = Math.floor(minutes / 60);

  const m = minutes % 60;

  return `${h}:${m.toString().padStart(2, "0")} ET`;

}



export function formatPriceLabel(price: number | undefined | null): string {

  if (price == null || !Number.isFinite(price)) return "—";

  return `$${price.toFixed(2)}`;

}



export function formatStrategyMetWindowLine(window: FinanceAiStrategyMetWindow): string {

  const start = formatMinutesEtLabel(window.startMinutesEt);

  const end =

    window.endMinutesEt != null

      ? formatMinutesEtLabel(window.endMinutesEt)

      : window.lastMinutesEt != null

        ? formatMinutesEtLabel(window.lastMinutesEt)

        : "…";

  const p0 = formatPriceLabel(window.startPrice);

  const p1 = formatPriceLabel(

    window.endPrice ?? window.lastPrice ?? window.startPrice

  );

  const name = window.strategyName ?? window.strategyId ?? "Estrategia";

  const dir = window.direction ? ` · ${window.direction}` : "";

  return `${start}–${end} · ${p0}→${p1} · ${name}${dir}`;

}



export function requirementStatusTone(status?: string): string {

  if (status === "met") return "text-green-800";

  if (status === "partial") return "text-amber-800";

  if (status === "manual") return "text-violet-800";

  return "text-red-800";

}

export function isStrategyMetEvalFullyMet(strategy: FinanceAiStrategyMetEval): boolean {
  const reqs = (strategy.requirements ?? []).filter(
    (r) => r.ruleKey !== "options_execution" && r.status !== "manual"
  );
  if (reqs.length === 0) return false;
  return reqs.every((r) => r.status === "met");
}

