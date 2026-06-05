import fs from "fs/promises";
import path from "path";
import { getStrategiesBaseDir } from "@/lib/strategy-markdown";

export const ANALYSIS_TEMPORALITIES_DOC = "elementos-analisis-temporalidades.md";

export function analysisDocFilePath(filename: string): string {
  return path.join(getStrategiesBaseDir(), filename);
}

export async function readAnalysisDoc(filename: string): Promise<string | null> {
  try {
    return await fs.readFile(analysisDocFilePath(filename), "utf8");
  } catch {
    return null;
  }
}
