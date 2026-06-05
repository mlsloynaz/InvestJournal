import { AnalysisType } from "@prisma/client";

export const NOTE_TYPE_COLORS: Record<string, string> = {
  [AnalysisType.NOTE]: "bg-blue-100 border-blue-400 text-blue-900",
  [AnalysisType.PREDICTION]: "bg-amber-100 border-amber-500 text-amber-900",
  [AnalysisType.MISTAKE]: "bg-red-100 border-red-400 text-red-900",
};

export function noteTypeButtonColor(code: string, selected: boolean): string {
  const base = NOTE_TYPE_COLORS[code] ?? "bg-gray-100 border-gray-300 text-gray-800";
  return selected ? `${base} ring-2 ring-investep-navy/30` : "bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-400";
}
