import { prisma } from "@/lib/db";
import type { MetricAccount, MetricTransaction } from "@/lib/metrics";

export async function loadAllAccounts(): Promise<MetricAccount[]> {
  const accounts = await prisma.account.findMany();
  return accounts.map((a) => ({
    id: a.id,
    firm: a.firm,
    size: a.size,
    stage: a.stage,
    status: a.status,
    purchasedAt: a.purchasedAt,
    fundedAt: a.fundedAt,
    failedAt: a.failedAt,
  }));
}

export async function loadAllTransactions(): Promise<MetricTransaction[]> {
  const transactions = await prisma.transaction.findMany();
  return transactions.map((t) => ({
    id: t.id,
    accountId: t.accountId,
    type: t.type,
    amount: t.amount,
    date: t.date,
  }));
}

export async function loadAccountById(id: string) {
  return prisma.account.findUnique({
    where: { id },
    include: { transactions: { orderBy: { date: "desc" } } },
  });
}
