import { PrismaClient } from "@prisma/client";

const id = Number(process.argv[2] || 1);
const prisma = new PrismaClient();

const s = await prisma.strategy.findUnique({
  where: { id },
  include: { requirements: { orderBy: { sortOrder: "asc" } } },
});
console.log(JSON.stringify(s, null, 2));
await prisma.$disconnect();
