import { describe, expect, it } from "vitest";
import {
  computeDashboardMetrics,
  computeEquityCurve,
  computeFirmBreakdown,
  computeMonthlySeries,
  type MetricAccount,
  type MetricTransaction,
} from "./metrics";

function account(overrides: Partial<MetricAccount> & { id: string }): MetricAccount {
  return {
    firm: "Topstep",
    size: 50000,
    stage: "EVALUATION",
    status: "ACTIVE",
    purchasedAt: new Date("2026-01-01"),
    fundedAt: null,
    failedAt: null,
    ...overrides,
  };
}

function tx(overrides: Partial<MetricTransaction> & { id: string; accountId: string }): MetricTransaction {
  return {
    type: "EXPENSE",
    amount: 100,
    date: new Date("2026-01-01"),
    ...overrides,
  };
}

describe("computeDashboardMetrics", () => {
  it("returns all zeros with no data", () => {
    const m = computeDashboardMetrics([], []);
    expect(m.totalExpense).toBe(0);
    expect(m.totalPayout).toBe(0);
    expect(m.netProfit).toBe(0);
    expect(m.roiPct).toBe(0);
    expect(m.fundingRatioPct).toBe(0);
    expect(m.successRatePct).toBe(0);
    expect(m.avgDaysToFund).toBeNull();
  });

  it("computes net profit, ROI and averages across expenses and payouts", () => {
    const accounts = [
      account({ id: "a1", stage: "FUNDED", fundedAt: new Date("2026-01-10") }),
    ];
    const transactions = [
      tx({ id: "t1", accountId: "a1", type: "EXPENSE", amount: 150, date: new Date("2026-01-01") }),
      tx({ id: "t2", accountId: "a1", type: "PAYOUT", amount: 500, date: new Date("2026-02-01") }),
      tx({ id: "t3", accountId: "a1", type: "PAYOUT", amount: 300, date: new Date("2026-03-01") }),
    ];

    const m = computeDashboardMetrics(accounts, transactions);

    expect(m.totalExpense).toBe(150);
    expect(m.totalPayout).toBe(800);
    expect(m.netProfit).toBe(650);
    expect(m.roiPct).toBeCloseTo((650 / 150) * 100);
    expect(m.avgPayoutPerPayout).toBe(400);
    expect(m.highestPayout).toBe(500);
    expect(m.liveWithPayoutCount).toBe(1);
    expect(m.pctLiveWithPayout).toBe(100);
    expect(m.avgDaysToFund).toBe(9);
  });

  it("treats accounts burned during evaluation as finished, not funded", () => {
    const accounts = [
      account({ id: "a1", stage: "FUNDED", fundedAt: new Date("2026-01-05") }),
      account({ id: "a2", stage: "EVALUATION", status: "FAILED", failedAt: new Date("2026-01-05") }),
      account({ id: "a3", stage: "EVALUATION", status: "ACTIVE" }),
    ];

    const m = computeDashboardMetrics(accounts, []);

    expect(m.evaluationsCount).toBe(3);
    expect(m.evaluationsFinished).toBe(2);
    expect(m.fundedCount).toBe(1);
    expect(m.fundingRatioPct).toBe(50);
    expect(m.successRatePct).toBeCloseTo(50);
  });

  it("counts a funded account with zero payouts as not paying out", () => {
    const accounts = [account({ id: "a1", stage: "FUNDED" })];
    const m = computeDashboardMetrics(accounts, []);

    expect(m.liveAccountsCount).toBe(1);
    expect(m.liveWithPayoutCount).toBe(0);
    expect(m.pctLiveWithPayout).toBe(0);
  });

  it("filters accounts and transactions by date range", () => {
    const accounts = [
      account({ id: "a1", purchasedAt: new Date("2026-01-01") }),
      account({ id: "a2", purchasedAt: new Date("2026-06-01") }),
    ];
    const transactions = [
      tx({ id: "t1", accountId: "a1", amount: 100, date: new Date("2026-01-15") }),
      tx({ id: "t2", accountId: "a2", amount: 200, date: new Date("2026-06-15") }),
    ];

    const m = computeDashboardMetrics(accounts, transactions, {
      from: new Date("2026-05-01"),
      to: new Date("2026-12-31"),
    });

    expect(m.evaluationsCount).toBe(1);
    expect(m.totalExpense).toBe(200);
  });

  it("filters by firm", () => {
    const accounts = [
      account({ id: "a1", firm: "Topstep" }),
      account({ id: "a2", firm: "Tradeify" }),
    ];
    const transactions = [
      tx({ id: "t1", accountId: "a1", amount: 100 }),
      tx({ id: "t2", accountId: "a2", amount: 250 }),
    ];

    const m = computeDashboardMetrics(accounts, transactions, { firm: "Tradeify" });

    expect(m.evaluationsCount).toBe(1);
    expect(m.totalExpense).toBe(250);
  });

  it("counts active accounts regardless of the date filter", () => {
    const accounts = [
      account({ id: "a1", status: "ACTIVE", purchasedAt: new Date("2020-01-01") }),
      account({ id: "a2", status: "CLOSED", purchasedAt: new Date("2026-01-01") }),
    ];

    const m = computeDashboardMetrics(accounts, [], {
      from: new Date("2026-01-01"),
      to: new Date("2026-12-31"),
    });

    expect(m.activeAccountsNow).toBe(1);
  });
});

describe("computeFirmBreakdown", () => {
  it("groups metrics per firm", () => {
    const accounts = [
      account({ id: "a1", firm: "Topstep", stage: "FUNDED" }),
      account({ id: "a2", firm: "Tradeify", stage: "EVALUATION", status: "FAILED" }),
    ];
    const transactions = [
      tx({ id: "t1", accountId: "a1", type: "EXPENSE", amount: 100 }),
      tx({ id: "t2", accountId: "a1", type: "PAYOUT", amount: 400 }),
      tx({ id: "t3", accountId: "a2", type: "EXPENSE", amount: 150 }),
    ];

    const breakdown = computeFirmBreakdown(accounts, transactions);

    expect(breakdown).toHaveLength(2);
    const topstep = breakdown.find((f) => f.firm === "Topstep")!;
    expect(topstep.netProfit).toBe(300);
    expect(topstep.fundedCount).toBe(1);

    const tradeify = breakdown.find((f) => f.firm === "Tradeify")!;
    expect(tradeify.totalExpense).toBe(150);
    expect(tradeify.fundingRatioPct).toBe(0);
  });
});

describe("computeEquityCurve", () => {
  it("accumulates expenses and payouts over time in order", () => {
    const accounts = [account({ id: "a1" })];
    const transactions = [
      tx({ id: "t1", accountId: "a1", type: "EXPENSE", amount: 100, date: new Date("2026-01-01") }),
      tx({ id: "t2", accountId: "a1", type: "PAYOUT", amount: 300, date: new Date("2026-01-05") }),
      tx({ id: "t3", accountId: "a1", type: "EXPENSE", amount: 50, date: new Date("2026-01-10") }),
    ];

    const curve = computeEquityCurve(accounts, transactions);

    expect(curve).toHaveLength(3);
    expect(curve[curve.length - 1]).toEqual({
      date: "2026-01-10",
      cumulativeExpense: 150,
      cumulativePayout: 300,
      cumulativeNet: 150,
    });
  });
});

describe("computeMonthlySeries", () => {
  it("buckets transactions by month", () => {
    const accounts = [account({ id: "a1" })];
    const transactions = [
      tx({ id: "t1", accountId: "a1", type: "EXPENSE", amount: 100, date: new Date("2026-01-15") }),
      tx({ id: "t2", accountId: "a1", type: "PAYOUT", amount: 400, date: new Date("2026-01-20") }),
      tx({ id: "t3", accountId: "a1", type: "EXPENSE", amount: 50, date: new Date("2026-02-05") }),
    ];

    const series = computeMonthlySeries(accounts, transactions);

    expect(series).toEqual([
      { month: "2026-01", expense: 100, payout: 400, net: 300 },
      { month: "2026-02", expense: 50, payout: 0, net: -50 },
    ]);
  });
});
