import { describe, expect, it } from "vitest";
import {
  payoffToProfitFactor,
  profitFactorToPayoff,
  runSimulation,
  summarize,
  type SimParams,
} from "./simulator";

const base: SimParams = {
  runs: 2000,
  trades: 100,
  tradesPerDay: 1,
  winRate: 0.5,
  payoff: 1,
  startEquity: 50000,
  riskType: "fixed",
  risk: 250,
  compound: false,
  drawdownType: "none",
  drawdownSize: 2000,
  lockAtStart: true,
  profitTarget: 0,
  dailyLossLimit: 0,
  seed: 42,
  evalCost: 100,
  activationCost: 0,
  fundedTrades: 10,
  payoutAmount: 0,
  payoutThreshold: 1500,
  traderSplitPct: 100,
  parallelAccounts: 10,
  fundedLockProfit: 0,
  maxPayouts: 0,
};

describe("profit factor <-> payoff", () => {
  it("es consistente en ambos sentidos", () => {
    const payoff = profitFactorToPayoff(1.5, 0.4);
    expect(payoff).toBeCloseTo(2.25);
    expect(payoffToProfitFactor(payoff, 0.4)).toBeCloseTo(1.5);
  });
});

describe("runSimulation", () => {
  it("es determinista con la misma semilla", () => {
    const a = runSimulation({ ...base, runs: 10 });
    const b = runSimulation({ ...base, runs: 10 });
    expect(a.map((r) => r.finalEquity)).toEqual(b.map((r) => r.finalEquity));
  });

  it("la media final converge a la expectativa", () => {
    const p = { ...base, winRate: 0.6, payoff: 1.5 };
    const s = summarize(runSimulation(p), p);
    const expected = p.startEquity + p.trades * s.expectancyPerTrade;
    expect(Math.abs(s.meanFinal - expected)).toBeLessThan(400);
  });

  it("drawdown estático falla al tocar start - DD", () => {
    const p: SimParams = { ...base, runs: 1, drawdownType: "static", drawdownSize: 500, winRate: 0 };
    const [r] = runSimulation(p);
    expect(r.outcome).toBe("failed");
    expect(r.finalEquity).toBe(49500);
    expect(r.tradesUsed).toBe(2);
  });

  it("pasa al alcanzar el objetivo", () => {
    const p: SimParams = {
      ...base, runs: 1, winRate: 1, payoff: 4, risk: 500, profitTarget: 2000, drawdownType: "intraday",
    };
    const [r] = runSimulation(p);
    expect(r.outcome).toBe("passed");
    expect(r.tradesUsed).toBe(1);
  });

  it("el trailing bloqueado nunca falla por encima del balance inicial", () => {
    const p: SimParams = { ...base, drawdownType: "intraday", drawdownSize: 1000, winRate: 0.55 };
    for (const r of runSimulation(p)) {
      if (r.outcome === "failed") expect(r.finalEquity).toBeLessThanOrEqual(p.startEquity);
    }
  });

  it("trailing EOD falla menos que intradía con los mismos trades", () => {
    const p: SimParams = {
      ...base, drawdownType: "eod", drawdownSize: 1500, payoff: 1.2,
      tradesPerDay: 5, profitTarget: 3000, trades: 200, risk: 200,
    };
    const eod = summarize(runSimulation(p), p);
    const intra = summarize(runSimulation({ ...p, drawdownType: "intraday" }), p);
    expect(eod.failedPct).toBeLessThan(intra.failedPct);
  });

  it("el límite diario detiene el resto del día", () => {
    const p: SimParams = {
      ...base, runs: 1, winRate: 0, tradesPerDay: 10, dailyLossLimit: 500, trades: 10,
    };
    const [r] = runSimulation(p);
    expect(r.tradesUsed).toBe(2);
  });

  it("cuenta fondeada: cobra cada vez que llega al umbral y calcula el neto", () => {
    const p: SimParams = {
      ...base, runs: 1, winRate: 1, payoff: 1, risk: 500, profitTarget: 1000,
      drawdownType: "static", payoutAmount: 1500, payoutThreshold: 1500,
      evalCost: 100, activationCost: 50, fundedTrades: 10,
    };
    const [r] = runSimulation(p);
    expect(r.funded).toBe(true);
    expect(r.payoutCount).toBe(3);
    expect(r.cash).toBe(4500);
    expect(r.net).toBe(4500 - 150);
  });

  it("días hasta cobrar y breakeven del lote", () => {
    // prueba: 2 días (+500/día hasta 1000). Fondeada: cobro al día 3 de fondeada => día 5 desde la compra
    const p: SimParams = {
      ...base, runs: 10, winRate: 1, payoff: 1, risk: 500, profitTarget: 1000,
      drawdownType: "static", payoutAmount: 1500, payoutThreshold: 1500,
      evalCost: 100, activationCost: 0, fundedTrades: 10, parallelAccounts: 5,
    };
    const res = runSimulation(p);
    expect(res[0].evalDays).toBe(2);
    expect(res[0].payoutDays).toEqual([5, 8, 11]);
    const s = summarize(res, p);
    expect(s.medianDaysToFirstPayout).toBe(5);
    expect(s.avgDaysToFund).toBe(2);
    expect(s.batchCount).toBe(2);
    expect(s.batchBreakevenPct).toBe(100);
    expect(s.medianBatchBreakevenDays).toBe(5); // 1er cobro de 1500 por cuenta ya cubre el coste del lote
    expect(s.accountsToBreakeven).toBe(1);
  });

  it("fondeada: el suelo se detiene en el beneficio indicado", () => {
    const p: SimParams = {
      ...base, runs: 1500, winRate: 0.7, payoff: 0.3, risk: 2000, drawdownType: "intraday",
      drawdownSize: 2000, profitTarget: 3000, payoutAmount: 1500, payoutThreshold: 3000, fundedTrades: 60,
    };
    const same = summarize(runSimulation({ ...p, fundedLockProfit: 2000 }), p); // = bloquear en inicial
    const off = summarize(runSimulation(p), p);
    expect(same.totalPayouts).toBe(off.totalPayouts);
    // suelo bloqueado más alto (+600) => se quema antes => menos cobros
    const higher = summarize(runSimulation({ ...p, fundedLockProfit: 2600 }), p);
    expect(higher.totalPayouts).toBeLessThan(off.totalPayouts);
  });

  it("costo hundido hasta el primer cobro incluye las cuentas quemadas", () => {
    const p: SimParams = {
      ...base, runs: 600, winRate: 0.7, payoff: 0.3, risk: 2000, drawdownType: "intraday",
      drawdownSize: 2000, profitTarget: 3000, payoutAmount: 1500, payoutThreshold: 1500,
      fundedTrades: 100, evalCost: 100, activationCost: 0,
    };
    const res = runSimulation(p);
    const s = summarize(res, p);
    const paid = res.filter((r) => r.payoutCount > 0).length;
    expect(s.sunkCostAvg).not.toBeNull();
    // coste = 100 por cuenta comprada, y el tramo medio = cuentas por cobro
    expect(s.sunkCostAvg).toBeCloseTo(100 * s.accountsToFirstPayoutAvg!, 6);
    expect(s.accountsToFirstPayoutAvg!).toBeGreaterThan(1);
    expect(paid).toBeGreaterThan(0);
  });

  it("Trailing (paseo intradía) respeta el win rate configurado", () => {
    // sin objetivo ni DD efectivo: cada cuenta es una secuencia de días; mide la fracción de días ganadores
    const p: SimParams = {
      ...base, runs: 1, trades: 40000, winRate: 0.7, payoff: 0.3, risk: 2000,
      drawdownType: "intraday", drawdownSize: 1e9, lockAtStart: false, startEquity: 1e9, profitTarget: 0,
    };
    const [r] = runSimulation(p);
    const wins = r.path.slice(1).filter((v, i) => v > r.path[i]).length;
    expect(wins / (r.path.length - 1)).toBeGreaterThan(0.69);
    expect(wins / (r.path.length - 1)).toBeLessThan(0.71);
  });

  it("con pérdida menor que el drawdown, EoD pasa más cuentas que Trailing", () => {
    const p: SimParams = {
      ...base, runs: 2000, winRate: 0.6, payoff: 0.6, risk: 1000, drawdownSize: 2000,
      profitTarget: 3000, trades: 100,
    };
    const eod = summarize(runSimulation({ ...p, drawdownType: "eod" }), p);
    const trailing = summarize(runSimulation({ ...p, drawdownType: "intraday" }), p);
    expect(eod.passedPct).toBeGreaterThan(trailing.passedPct);
  });

  it("si quema la prueba no hay fondeada y solo pierde el coste", () => {
    const p: SimParams = {
      ...base, runs: 1, winRate: 0, drawdownType: "static", drawdownSize: 500,
      profitTarget: 1000, payoutAmount: 1500,
    };
    const [r] = runSimulation(p);
    expect(r.funded).toBe(false);
    expect(r.net).toBe(-100);
  });

  it("summarize cuenta pasadas y cobradoras", () => {
    const p: SimParams = {
      ...base, runs: 500, winRate: 0.7, payoff: 0.3, risk: 2000, drawdownType: "eod",
      drawdownSize: 2000, profitTarget: 3000, payoutAmount: 1500, payoutThreshold: 1500, fundedTrades: 50,
    };
    const s = summarize(runSimulation(p), p);
    expect(s.passedCount + s.failedCount + s.incompleteCount).toBe(500);
    expect(s.fundedCount).toBe(s.passedCount);
    expect(s.fundedWithPayoutCount).toBeLessThanOrEqual(s.fundedCount);
    // 0.7^5 = 16.8% de pasar la prueba
    expect(s.passedPct).toBeGreaterThan(12);
    expect(s.passedPct).toBeLessThan(22);
  });
});

describe("maxPayouts", () => {
  it("limita los cobros por cuenta fondeada", () => {
    const p: SimParams = {
      ...base,
      winRate: 0.95,
      payoff: 1,
      risk: 500,
      drawdownType: "static",
      drawdownSize: 20000,
      profitTarget: 1000,
      fundedTrades: 200,
      payoutAmount: 500,
      payoutThreshold: 500,
      runs: 200,
      trades: 200,
    };
    const unlimited = runSimulation({ ...p, maxPayouts: 0 });
    const capped = runSimulation({ ...p, maxPayouts: 4 });
    expect(Math.max(...unlimited.map((r) => r.payoutCount))).toBeGreaterThan(4);
    expect(Math.max(...capped.map((r) => r.payoutCount))).toBe(4);
  });
});
