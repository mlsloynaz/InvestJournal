export type PremarketStopPhase = "prep" | "analysis" | "apertura" | "mercado" | "fin";

export type PremarketChecklistStop = {
  id: string;
  label: string;
  shortLabel: string;
  icon: string;
  phase: PremarketStopPhase;
  /** Indices into analysis-elements sections for checklist-pre-market */
  sectionIndices: number[];
  hideStepTitle?: boolean;
};

export const PREMARKET_PHASE_LABELS: Record<PremarketStopPhase, string> = {
  prep: "Antes de empezar",
  analysis: "Análisis pre-market",
  apertura: "Lectura de apertura",
  mercado: "Mercado abierto",
  fin: "Después de abrir",
};

export const PREMARKET_CHECKLIST_STOPS: PremarketChecklistStop[] = [
  {
    id: "inicio",
    label: "Inicio del recorrido",
    shortLabel: "Inicio",
    icon: "🚀",
    phase: "prep",
    sectionIndices: [0, 1, 2],
  },
  {
    id: "paso-0",
    label: "Paso 0 — Preparación",
    shortLabel: "Prep",
    icon: "📝",
    phase: "prep",
    sectionIndices: [3],
    hideStepTitle: true,
  },
  {
    id: "paso-1",
    label: "Paso 1 — Reunión FED",
    shortLabel: "FED",
    icon: "🏛️",
    phase: "analysis",
    sectionIndices: [4],
    hideStepTitle: true,
  },
  {
    id: "paso-2",
    label: "Paso 2 — Earnings",
    shortLabel: "Earn",
    icon: "📊",
    phase: "analysis",
    sectionIndices: [5],
    hideStepTitle: true,
  },
  {
    id: "paso-3",
    label: "Paso 3 — Bollinger",
    shortLabel: "BB",
    icon: "〰️",
    phase: "analysis",
    sectionIndices: [6],
    hideStepTitle: true,
  },
  {
    id: "paso-4",
    label: "Paso 4 — Medias móviles",
    shortLabel: "MA",
    icon: "📈",
    phase: "analysis",
    sectionIndices: [7],
    hideStepTitle: true,
  },
  {
    id: "paso-5",
    label: "Paso 5 — Edge lines",
    shortLabel: "H-L",
    icon: "➖",
    phase: "analysis",
    sectionIndices: [8],
    hideStepTitle: true,
  },
  {
    id: "paso-6",
    label: "Paso 6 — Tendencia y salto",
    shortLabel: "Gap",
    icon: "📐",
    phase: "analysis",
    sectionIndices: [9],
    hideStepTitle: true,
  },
  {
    id: "apertura-bollinger",
    label: "¿Dentro o fuera de Bollinger?",
    shortLabel: "Apert.",
    icon: "🎯",
    phase: "apertura",
    sectionIndices: [10, 11],
  },
  {
    id: "resumen",
    label: "Resumen — ¿Se cumple?",
    shortLabel: "Resum.",
    icon: "✅",
    phase: "apertura",
    sectionIndices: [12, 13],
  },
  {
    id: "mercado-abierto",
    label: "9:30 AM — Mercado abierto",
    shortLabel: "9:30",
    icon: "🔔",
    phase: "mercado",
    sectionIndices: [14],
    hideStepTitle: true,
  },
  {
    id: "fin",
    label: "Seguir monitoreando",
    shortLabel: "Fin",
    icon: "🏁",
    phase: "fin",
    sectionIndices: [15, 16],
  },
];
