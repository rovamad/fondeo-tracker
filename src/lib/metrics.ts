export type AccountStage = "EVALUATION" | "FUNDED";
export type AccountStatus = "ACTIVE" | "FAILED" | "CLOSED";
export type TransactionType = "EXPENSE" | "PAYOUT";

export interface MetricAccount {
  id: string;
  firm: string;
  size: number;
  stage: AccountStage;
  status: AccountStatus;
  purchasedAt: Date;
  fundedAt: Date | null;
  failedAt: Date | null;
}

export interface MetricTransaction {
  id: string;
  accountId: string;
  type: TransactionType;
  amount: number;
  date: Date;
}

export interface DateRange {
  from?: Date;
  to?: Date;
}

export interface MetricsFilter extends DateRange {
  firm?: string;
}

function inRange(date: Date, range?: DateRange): boolean {
  if (!range) return true;
  if (range.from && date < range.from) return false;
  if (range.to && date > range.to) return false;
  return true;
}

function applyFilter(
  accounts: MetricAccount[],
  transactions: MetricTransaction[],
  filter?: MetricsFilter
): { accounts: MetricAccount[]; transactions: MetricTransaction[] } {
  const byFirm = filter?.firm
    ? accounts.filter((a) => a.firm === filter.firm)
    : accounts;
  const accountIds = new Set(byFirm.map((a) => a.id));

  const filteredAccounts = byFirm.filter((a) => inRange(a.purchasedAt, filter));
  const filteredTransactions = transactions.filter(
    (t) => accountIds.has(t.accountId) && inRange(t.date, filter)
  );

  return { accounts: filteredAccounts, transactions: filteredTransactions };
}

function sum(values: number[]): number {
  return values.reduce((acc, v) => acc + v, 0);
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return sum(values) / values.length;
}

export interface DashboardMetrics {
  totalExpense: number;
  totalPayout: number;
  netProfit: number;
  roiPct: number;
  evaluationsCount: number;
  evaluationsFinished: number;
  fundedCount: number;
  fundingRatioPct: number;
  liveAccountsCount: number;
  liveWithPayoutCount: number;
  pctLiveWithPayout: number;
  approvedCount: number;
  failedCount: number;
  successRatePct: number;
  avgExpensePerAccount: number;
  avgPayoutPerPayout: number;
  costPerFundedAccount: number;
  highestPayout: number;
  avgDaysToFund: number | null;
  activeAccountsNow: number;
}

export function computeDashboardMetrics(
  allAccounts: MetricAccount[],
  allTransactions: MetricTransaction[],
  filter?: MetricsFilter
): DashboardMetrics {
  const { accounts, transactions } = applyFilter(allAccounts, allTransactions, filter);

  const expenses = transactions.filter((t) => t.type === "EXPENSE");
  const payouts = transactions.filter((t) => t.type === "PAYOUT");

  const totalExpense = sum(expenses.map((t) => t.amount));
  const totalPayout = sum(payouts.map((t) => t.amount));
  const netProfit = totalPayout - totalExpense;
  const roiPct = totalExpense > 0 ? (netProfit / totalExpense) * 100 : 0;

  const evaluationsCount = accounts.length;
  const fundedAccounts = accounts.filter((a) => a.stage === "FUNDED");
  const fundedCount = fundedAccounts.length;
  const failedInEvaluation = accounts.filter(
    (a) => a.stage === "EVALUATION" && a.status === "FAILED"
  ).length;
  const evaluationsFinished = fundedCount + failedInEvaluation;
  const fundingRatioPct =
    evaluationsFinished > 0 ? (fundedCount / evaluationsFinished) * 100 : 0;

  const liveAccountsCount = fundedAccounts.length;
  const fundedAccountIds = new Set(fundedAccounts.map((a) => a.id));
  const accountIdsWithPayout = new Set(
    payouts.filter((t) => fundedAccountIds.has(t.accountId)).map((t) => t.accountId)
  );
  const liveWithPayoutCount = accountIdsWithPayout.size;
  const pctLiveWithPayout =
    liveAccountsCount > 0 ? (liveWithPayoutCount / liveAccountsCount) * 100 : 0;

  const approvedCount = fundedCount;
  const failedCount = accounts.filter((a) => a.status === "FAILED").length;
  const successRatePct =
    approvedCount + failedCount > 0
      ? (approvedCount / (approvedCount + failedCount)) * 100
      : 0;

  const avgExpensePerAccount =
    evaluationsCount > 0 ? totalExpense / evaluationsCount : 0;
  const avgPayoutPerPayout = payouts.length > 0 ? totalPayout / payouts.length : 0;
  const costPerFundedAccount = fundedCount > 0 ? totalExpense / fundedCount : 0;
  const highestPayout = payouts.length > 0 ? Math.max(...payouts.map((t) => t.amount)) : 0;

  const daysToFund = fundedAccounts
    .filter((a) => a.fundedAt)
    .map((a) => (a.fundedAt!.getTime() - a.purchasedAt.getTime()) / (1000 * 60 * 60 * 24));
  const avgDaysToFund = daysToFund.length > 0 ? average(daysToFund) : null;

  const activeAccountsNow = allAccounts.filter((a) => a.status === "ACTIVE").length;

  return {
    totalExpense,
    totalPayout,
    netProfit,
    roiPct,
    evaluationsCount,
    evaluationsFinished,
    fundedCount,
    fundingRatioPct,
    liveAccountsCount,
    liveWithPayoutCount,
    pctLiveWithPayout,
    approvedCount,
    failedCount,
    successRatePct,
    avgExpensePerAccount,
    avgPayoutPerPayout,
    costPerFundedAccount,
    highestPayout,
    avgDaysToFund,
    activeAccountsNow,
  };
}

export interface FirmMetrics {
  firm: string;
  accountsCount: number;
  totalExpense: number;
  totalPayout: number;
  netProfit: number;
  roiPct: number;
  fundedCount: number;
  fundingRatioPct: number;
  pctLiveWithPayout: number;
}

export function computeFirmBreakdown(
  allAccounts: MetricAccount[],
  allTransactions: MetricTransaction[],
  filter?: DateRange
): FirmMetrics[] {
  const firms = Array.from(new Set(allAccounts.map((a) => a.firm))).sort();

  return firms.map((firm) => {
    const m = computeDashboardMetrics(allAccounts, allTransactions, { ...filter, firm });
    return {
      firm,
      accountsCount: m.evaluationsCount,
      totalExpense: m.totalExpense,
      totalPayout: m.totalPayout,
      netProfit: m.netProfit,
      roiPct: m.roiPct,
      fundedCount: m.fundedCount,
      fundingRatioPct: m.fundingRatioPct,
      pctLiveWithPayout: m.pctLiveWithPayout,
    };
  });
}

export interface EquityPoint {
  date: string;
  cumulativeExpense: number;
  cumulativePayout: number;
  cumulativeNet: number;
}

export function computeEquityCurve(
  allAccounts: MetricAccount[],
  allTransactions: MetricTransaction[],
  filter?: MetricsFilter
): EquityPoint[] {
  const { transactions } = applyFilter(allAccounts, allTransactions, filter);
  const sorted = [...transactions].sort((a, b) => a.date.getTime() - b.date.getTime());

  let cumulativeExpense = 0;
  let cumulativePayout = 0;
  const points: EquityPoint[] = [];

  for (const t of sorted) {
    if (t.type === "EXPENSE") cumulativeExpense += t.amount;
    else cumulativePayout += t.amount;

    points.push({
      date: t.date.toISOString().slice(0, 10),
      cumulativeExpense,
      cumulativePayout,
      cumulativeNet: cumulativePayout - cumulativeExpense,
    });
  }

  return points;
}

export interface MonthlyPoint {
  month: string;
  expense: number;
  payout: number;
  net: number;
}

export function computeMonthlySeries(
  allAccounts: MetricAccount[],
  allTransactions: MetricTransaction[],
  filter?: MetricsFilter
): MonthlyPoint[] {
  const { transactions } = applyFilter(allAccounts, allTransactions, filter);
  const byMonth = new Map<string, { expense: number; payout: number }>();

  for (const t of transactions) {
    const month = t.date.toISOString().slice(0, 7);
    const entry = byMonth.get(month) ?? { expense: 0, payout: 0 };
    if (t.type === "EXPENSE") entry.expense += t.amount;
    else entry.payout += t.amount;
    byMonth.set(month, entry);
  }

  return Array.from(byMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, { expense, payout }]) => ({
      month,
      expense,
      payout,
      net: payout - expense,
    }));
}
