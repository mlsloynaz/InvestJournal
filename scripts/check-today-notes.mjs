import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const today = new Date().toISOString().slice(0, 10);

const tickers = await prisma.ticker.findMany({
  select: { symbol: true, isFavorite: true },
});
console.log("TICKERS", JSON.stringify(tickers));

const notes = await prisma.analysisEntry.findMany({
  orderBy: { entryAt: "desc" },
  include: { ticker: { select: { symbol: true } } },
});
console.log(
  "NOTES",
  JSON.stringify(
    notes.map((x) => ({
      symbol: x.ticker.symbol,
      date: x.entryDate.toISOString().slice(0, 10),
      type: x.type,
      body: x.body.slice(0, 40),
    }))
  )
);
console.log("TODAY", today);

await prisma.$disconnect();
