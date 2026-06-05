"use server";

import { buildAiContextMarkdown } from "@/server/services/ai-export";

export async function getAiExportMarkdown(symbol: string, lookbackDays = 14) {
  const markdown = await buildAiContextMarkdown(symbol, lookbackDays);
  return { markdown };
}
