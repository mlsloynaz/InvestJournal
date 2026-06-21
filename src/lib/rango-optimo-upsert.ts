import { prisma } from "@/lib/db";
import { midpoint } from "@/lib/rango-optimo-import";

export type RangoOptimoUpsertInput = {
  symbol: string;
  rangoOptimoLow: number | null;
  rangoOptimoHigh: number | null;
  minPrice: number | null;
  maxPrice: number | null;
};

export function hasRangoOptimoInput(data: RangoOptimoUpsertInput): boolean {
  return (
    data.rangoOptimoLow != null ||
    data.rangoOptimoHigh != null ||
    data.minPrice != null ||
    data.maxPrice != null
  );
}

export async function upsertRangoOptimoEntry(
  data: RangoOptimoUpsertInput,
  client: Pick<typeof prisma, "rangoOptimo"> = prisma
): Promise<void> {
  if (!hasRangoOptimoInput(data)) return;

  const priceOptimo = midpoint(data.rangoOptimoLow, data.rangoOptimoHigh);

  await client.rangoOptimo.upsert({
    where: { symbol: data.symbol },
    create: {
      symbol: data.symbol,
      rangoOptimoLow: data.rangoOptimoLow,
      rangoOptimoHigh: data.rangoOptimoHigh,
      minPrice: data.minPrice,
      maxPrice: data.maxPrice,
      priceOptimo,
    },
    update: {
      rangoOptimoLow: data.rangoOptimoLow,
      rangoOptimoHigh: data.rangoOptimoHigh,
      minPrice: data.minPrice,
      maxPrice: data.maxPrice,
      priceOptimo,
    },
  });
}
