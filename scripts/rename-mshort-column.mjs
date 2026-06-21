import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  const cols = await prisma.$queryRawUnsafe(
    "SHOW COLUMNS FROM tickers LIKE 'bollinger_15_enabled'"
  );
  if (Array.isArray(cols) && cols.length > 0) {
    await prisma.$executeRawUnsafe(
      "ALTER TABLE tickers CHANGE bollinger_15_enabled mshort TINYINT(1) NOT NULL DEFAULT 0"
    );
    console.log("Renamed bollinger_15_enabled -> mshort");
  } else {
    const mshort = await prisma.$queryRawUnsafe("SHOW COLUMNS FROM tickers LIKE 'mshort'");
    if (Array.isArray(mshort) && mshort.length > 0) {
      console.log("Column mshort already exists");
    } else {
      console.log("Neither column found � run prisma db push");
    }
  }
} finally {
  await prisma.$disconnect();
}
