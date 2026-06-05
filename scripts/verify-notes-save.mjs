import { AnalysisType, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const ticker = await prisma.ticker.findFirst({ select: { id: true, symbol: true } });
  if (!ticker) {
    console.log("RESULT", "NO_TICKER");
    return;
  }

  for (const type of [AnalysisType.NOTE, AnalysisType.PREDICTION, AnalysisType.MISTAKE]) {
    const entry = await prisma.analysisEntry.create({
      data: {
        tickerId: ticker.id,
        entryDate: new Date("2026-06-02T00:00:00.000Z"),
        type,
        body: `Verify save for ${type}`,
      },
    });
    const found = await prisma.analysisEntry.findUnique({ where: { id: entry.id } });
    console.log(type, found?.type === type ? "OK" : "FAIL", "id", entry.id);
    await prisma.analysisEntry.delete({ where: { id: entry.id } });
  }

  const byType = await prisma.analysisEntry.groupBy({
    by: ["type"],
    _count: { _all: true },
  });
  console.log("EXISTING_BY_TYPE", JSON.stringify(byType));

  const sample = await prisma.analysisEntry.findMany({
    take: 10,
    orderBy: [{ entryAt: "desc" }],
    select: { id: true, type: true, body: true, ticker: { select: { symbol: true } } },
  });
  console.log(
    "RECENT",
    JSON.stringify(
      sample.map((r) => ({
        id: r.id,
        symbol: r.ticker.symbol,
        type: r.type,
        body: r.body.slice(0, 40),
      }))
    )
  );

  console.log("RESULT", "ALL_TYPES_OK");
}

main()
  .catch((e) => {
    console.error("ERROR", e.message || e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
