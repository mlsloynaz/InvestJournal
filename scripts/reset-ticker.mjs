import { PrismaClient } from "@prisma/client";

const symbol = (process.argv[2] || "AAPL").trim().toUpperCase();
const prisma = new PrismaClient();

async function main() {
  const ticker = await prisma.ticker.findUnique({ where: { symbol } });

  if (!ticker) {
    console.log(`Ticker ${symbol} not found.`);
    return;
  }

  const [analysis, weeks, earnings] = await prisma.$transaction([
    prisma.analysisEntry.deleteMany({ where: { tickerId: ticker.id } }),
    prisma.tickerWeek.deleteMany({ where: { tickerId: ticker.id } }),
    prisma.earningsEvent.deleteMany({ where: { tickerId: ticker.id } }),
  ]);

  console.log(`Reset ${symbol}:`);
  console.log(`  - ${weeks.count} semanas (checklist, métricas, trades)`);
  console.log(`  - ${analysis.count} notas de análisis`);
  console.log(`  - ${earnings.count} earnings events`);
  console.log(`Ticker ${symbol} kept in Config — add weeks again when you use Análisis básico.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
