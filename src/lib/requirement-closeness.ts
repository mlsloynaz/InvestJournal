import type { FinanceAiStrategyCheckItem } from "@/lib/finance-ai-types";



export type RequirementCloseness = {

  item: FinanceAiStrategyCheckItem;

  scorePct: number;

  label: string;

  statusLabel: string;

  fluctuationNote?: string;

};



function clamp(n: number, min: number, max: number): number {

  return Math.min(max, Math.max(min, n));

}



function parsePctFromEvidence(evidence: string): number | null {

  const m = evidence.match(/(\d+(?:\.\d+)?)\s*%/);

  if (!m) return null;

  const n = Number(m[1]);

  return Number.isFinite(n) ? n : null;

}



export function requirementCloseness(item: FinanceAiStrategyCheckItem): RequirementCloseness {

  const label = item.label?.trim() || item.requirementId?.trim() || "Requisito";

  const ev = (item.evidence ?? "").trim();

  const evLower = ev.toLowerCase();



  if (item.status === "met") {

    return { item, scorePct: 100, label, statusLabel: "Cumplido" };

  }



  if (item.status === "manual") {
    return {
      item,
      scorePct: 40,
      label,
      statusLabel: "Manual",
    };
  }



  if (item.status === "unknown") {

    return {

      item,

      scorePct: 20,

      label,

      statusLabel: "Sin dato",

      fluctuationNote: "Sin lectura automática — el próximo poll puede aportar datos.",

    };

  }



  let score = item.status === "partial" ? 68 : 12;

  const pct = parsePctFromEvidence(ev);



  if (pct != null) {

    if (item.status === "partial") {

      score = clamp(90 - pct * 4, 52, 88);

    } else {

      score = clamp(45 - pct * 3, 5, 40);

    }

  }



  if (

    evLower.includes("cerca") ||

    evLower.includes("parcial") ||

    evLower.includes("estrecho") ||

    evLower.includes("mixto")

  ) {

    score = Math.max(score, item.status === "partial" ? 62 : 28);

  }



  if (

    evLower.includes("lejos") ||

    evLower.includes("entrelazad") ||

    evLower.includes("no cumple") ||

    evLower.includes("fuera")

  ) {

    score = Math.min(score, item.status === "partial" ? 55 : 18);

  }



  const statusLabel = item.status === "partial" ? "Parcial" : "Pendiente";

  const fluctuationNote =

    "El movimiento del precio puede acercar o alejar este requisito antes del próximo poll NOW.";



  return {

    item,

    scorePct: Math.round(score),

    label,

    statusLabel,

    fluctuationNote: ev ? `${fluctuationNote} ${ev}` : fluctuationNote,

  };

}



export function pendingRequirementsWithCloseness(

  checklist: FinanceAiStrategyCheckItem[] | undefined

): RequirementCloseness[] {

  return (checklist ?? [])

    .filter(

      (item) =>

        item.status === "not_met" ||

        item.status === "partial" ||

        item.status === "manual" ||

        item.status === "unknown"

    )

    .map(requirementCloseness)

    .sort((a, b) => b.scorePct - a.scorePct);

}


