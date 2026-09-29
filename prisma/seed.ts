import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL || "file:./prisma/dev.db",
});
const prisma = new PrismaClient({ adapter });

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

async function main() {
  await prisma.transaction.deleteMany();
  await prisma.account.deleteMany();

  const a1 = await prisma.account.create({
    data: {
      firm: "Topstep",
      size: 50000,
      label: "Cuenta 1",
      stage: "FUNDED",
      status: "ACTIVE",
      purchasedAt: daysAgo(90),
      fundedAt: daysAgo(75),
      transactions: {
        create: [
          { type: "EXPENSE", category: "EVALUATION", amount: 165, date: daysAgo(90) },
          { type: "EXPENSE", category: "ACTIVATION", amount: 85, date: daysAgo(74) },
          { type: "PAYOUT", amount: 1200, date: daysAgo(45) },
          { type: "PAYOUT", amount: 900, date: daysAgo(15) },
        ],
      },
    },
  });

  const a2 = await prisma.account.create({
    data: {
      firm: "Tradeify",
      size: 100000,
      label: "Cuenta 2",
      stage: "FUNDED",
      status: "ACTIVE",
      purchasedAt: daysAgo(60),
      fundedAt: daysAgo(40),
      transactions: {
        create: [
          { type: "EXPENSE", category: "EVALUATION", amount: 220, date: daysAgo(60) },
          { type: "PAYOUT", amount: 1500, date: daysAgo(10) },
        ],
      },
    },
  });

  const a3 = await prisma.account.create({
    data: {
      firm: "Earn2Trade",
      size: 50000,
      label: "Cuenta 3 - fallida",
      stage: "EVALUATION",
      status: "FAILED",
      purchasedAt: daysAgo(50),
      failedAt: daysAgo(35),
      transactions: {
        create: [{ type: "EXPENSE", category: "EVALUATION", amount: 150, date: daysAgo(50) }],
      },
    },
  });

  const a4 = await prisma.account.create({
    data: {
      firm: "Topstep",
      size: 25000,
      label: "Cuenta 4 - en evaluación",
      stage: "EVALUATION",
      status: "ACTIVE",
      purchasedAt: daysAgo(20),
      transactions: {
        create: [{ type: "EXPENSE", category: "EVALUATION", amount: 110, date: daysAgo(20) }],
      },
    },
  });

  const a5 = await prisma.account.create({
    data: {
      firm: "AlphaFutures",
      size: 50000,
      label: "Cuenta 5 - live sin retiro aún",
      stage: "FUNDED",
      status: "ACTIVE",
      purchasedAt: daysAgo(30),
      fundedAt: daysAgo(12),
      transactions: {
        create: [
          { type: "EXPENSE", category: "EVALUATION", amount: 175, date: daysAgo(30) },
          { type: "EXPENSE", category: "RESET", amount: 60, date: daysAgo(20) },
        ],
      },
    },
  });

  console.log("Seed listo:", [a1.id, a2.id, a3.id, a4.id, a5.id]);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
