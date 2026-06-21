import { PrismaClient } from "@prisma/client";

/** Handwritten reference prices — extend as needed. */
const ROWS = [
  { symbol: "V", priceOptimo: 175 },
  { symbol: "AAPL", priceOptimo: 185 },
  { symbol: "TSLA", priceOptimo: 175 },
  { symbol: "NVDA", priceOptimo: 450 },
  { symbol: "MSFT", priceOptimo: 320 },
];

const prisma = new PrismaClient();

async function main() {
  for (const row of ROWS) {
    await prisma.rangoOptimo.upsert({
      where: { symbol: row.symbol },
      create: {
        symbol: row.symbol,
        priceOptimo: row.priceOptimo,
      },
      update: {
        priceOptimo: row.priceOptimo,
      },
    });
    console.log(`rango_optimo: ${row.symbol} → ${row.priceOptimo}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
