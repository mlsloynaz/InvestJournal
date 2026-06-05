import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.$connect();
  const count = await prisma.strategy.count();
  console.log("OK: MySQL connected. strategies count:", count);
}

main()
  .catch((e) => {
    console.error("FAIL:", e.message || e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
