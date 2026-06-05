import { AnalysisType } from "@prisma/client";
import { z } from "zod";

export const createTickerSchema = z.object({
  symbol: z.string().min(1).max(16),
  name: z.string().max(128).optional(),
  notes: z.string().optional(),
});

export const analysisEntrySchema = z.object({
  tickerId: z.coerce.number().int().positive(),
  entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  type: z.nativeEnum(AnalysisType),
  body: z.string().min(1),
  tickerWeekId: z.coerce.number().int().positive().optional(),
});

export const metValueSchema = z.enum(["", "true", "false"]).transform((v) => {
  if (v === "") return null;
  return v === "true";
});
