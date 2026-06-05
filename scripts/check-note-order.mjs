import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const notes = await prisma.analysisEntry.findMany({
  where: { entryDate: new Date("2026-06-03T00:00:00.000Z") },
  orderBy: [{ entryAt: "desc" }, { id: "desc" }],
  select: { id: true, entryAt: true, body: true },
});

console.log(
  JSON.stringify(
    notes.map((n) => ({
      id: n.id,
      entryAt: n.entryAt.toISOString(),
      body: n.body.slice(0, 40),
    }))
  )
);

await prisma.$disconnect();
