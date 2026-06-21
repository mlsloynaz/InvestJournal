import { AnalysisType } from "@prisma/client";
import { z } from "zod";

const optionalPriceField = z
  .union([z.string(), z.number()])
  .optional()
  .transform((v) => {
    if (v == null || v === "") return null;
    const n = Number(String(v).trim());
    return Number.isFinite(n) ? n : null;
  });

const journalRangoFields = {
  rangoOptimoLow: optionalPriceField,
  rangoOptimoHigh: optionalPriceField,
  minPrice: optionalPriceField,
  maxPrice: optionalPriceField,
};

export const createTickerSchema = z.object({
  symbol: z.string().min(1).max(16),
  name: z.string().max(128).optional(),
  notes: z.string().optional(),
});

export const createJournalTickerSchema = createTickerSchema.extend({
  isFavorite: z
    .enum(["0", "1", "true", "false", "on", ""])
    .optional()
    .transform((v) => v === "1" || v === "true" || v === "on"),
  pollInterval: z.string().optional(),
  ...journalRangoFields,
});

export const updateTickerSchema = z.object({
  id: z.coerce.number().int().positive(),
  symbol: z.string().min(1).max(16),
  name: z.string().max(128).optional(),
  notes: z.string().optional(),
});

export const updateJournalTickerSchema = updateTickerSchema.extend({
  isFavorite: z
    .enum(["0", "1", "true", "false", "on", ""])
    .optional()
    .transform((v) => v === "1" || v === "true" || v === "on"),
  pollInterval: z.string().optional(),
  ...journalRangoFields,
});

export const deleteTickerSchema = z.object({
  id: z.coerce.number().int().positive(),
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
