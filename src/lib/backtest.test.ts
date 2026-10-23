import { describe, expect, it } from "vitest";
import {
  historyStats,
  parseNinjaTraderReport,
  replayAccount,
  replayRolling,
  replaySequential,
  type HistoryDay,
} from "./backtest";

const rules = {
  startEquity: 50000,
  drawdownType: "static" as const,
  drawdownSize: 2000,
  lockAtStart: true,
  profitTarget: 3000,
  dailyLossLimit: 0,
  trades: 100,
  fundedTrades: 100,
  evalCost: 100,
  activationCost: 0,
  payoutAmount: 0,
  payoutThreshold: 1500,
  traderSplitPct: 100,
  fundedLockProfit: 0,
  maxPayouts: 0,
};

const day = (n: number, net: number, dd = Math.min(0, net)): HistoryDay => ({
  date: `2026-01-${String(n).padStart(2, "0")}`,
  net,
  maxDrawdown: dd,
  trades: 1,
});

describe("parseNinjaTraderReport", () => {
  const csv = [
    "Period,#,Cum. net profit,Net profit,Max. drawdown,",
    '13/3/2024,25,-$3442.80,-$3442.80,-$4111.40,',
    '14/3/2024,45,"-$1,482.00","$1,960.80",-$156.52,',
  ].join("\r\n");

  it("lee fechas d/m/yyyy e importes con $ y comas", () => {
    const days = parseNinjaTraderReport(csv);
    expect(days).toEqual([
      { date: "2024-03-13", net: -3442.8, maxDrawdown: -4111.4, trades: 25 },
      { date: "2024-03-14", net: 1960.8, maxDrawdown: -156.52, trades: 45 },
    ]);
  });

  it("falla si faltan columnas o el periodo no es diario", () => {
    expect(() => parseNinjaTraderReport("a,b\n1,2")).toThrow(/Faltan columnas/);
    expect(() =>
      parseNinjaTraderReport("Period,Net profit,Max. drawdown\nmar 2024,$1,$0")
    ).toThrow(/no es un día/);
  });
});

describe("historyStats", () => {
  it("calcula PF, % de días ganadores y extremos", () => {
    const s = historyStats([day(1, 300), day(2, -100), day(3, 100)]);
    expect(s.profitFactor).toBeCloseTo(4);
    expect(s.winDaysPct).toBeCloseTo(66.67, 1);
    expect(s.worstDay).toBe(-100);
    expect(s.totalNet).toBe(300);
  });
});

describe("replayAccount", () => {
  it("pasa la prueba al alcanzar el objetivo", () => {
    const a = replayAccount([day(1, 1500), day(2, 1500), day(3, 10)], 0, rules);
    expect(a.outcome).toBe("passed");
    expect(a.evalDays).toBe(2);
    expect(a.net).toBe(-100);
  });

  it("quema con drawdown estático usando el peor punto del día", () => {
    // cierra +100 pero cayó 2500 dentro del día
    const a = replayAccount([day(1, 100, -2500)], 0, rules);
    expect(a.outcome).toBe("failed");
  });

  it("trailing intradía: el suelo sigue al pico y se bloquea en el inicial", () => {
    const r = { ...rules, drawdownType: "intraday" as const, profitTarget: 0 };
    // +3000 (pico 53000, suelo 51000 → bloqueado en 50000); luego -3100 → equity 49900 < 50000
    const a = replayAccount([day(1, 3000), day(2, -3100)], 0, r);
    expect(a.outcome).toBe("failed");
  });

  it("cobra en la fondeada y aplica el reparto", () => {
    const r = { ...rules, payoutAmount: 1500, payoutThreshold: 1500, traderSplitPct: 90, activationCost: 50 };
    const a = replayAccount([day(1, 3000), day(2, 1500), day(3, 0)], 0, r);
    expect(a.funded).toBe(true);
    expect(a.payoutCount).toBe(1);
    expect(a.cash).toBeCloseTo(1350);
    expect(a.cost).toBe(150);
    expect(a.net).toBeCloseTo(1200);
  });

  it("cierra la cuenta al llegar al máximo de cobros", () => {
    const r = { ...rules, payoutAmount: 1500, payoutThreshold: 1500, maxPayouts: 2 };
    const d = [day(1, 3000), ...Array.from({ length: 10 }, (_, i) => day(i + 2, 1500))];
    const a = replayAccount(d, 0, r);
    expect(a.payoutCount).toBe(2);
    expect(a.daysUsed).toBe(3);
  });

  it("queda sin resolver si se acaba el histórico", () => {
    expect(replayAccount([day(1, 10), day(2, 10)], 0, rules).outcome).toBe("incomplete");
  });
});

describe("replaySequential / replayRolling", () => {
  const days = [day(1, 3000), day(2, -2500, -2500), day(3, 3000)];

  it("compra una cuenta nueva al terminar la anterior", () => {
    const accs = replaySequential(days, rules);
    expect(accs.map((a) => a.outcome)).toEqual(["passed", "failed", "passed"]);
    expect(accs.map((a) => a.startDate)).toEqual(["2026-01-01", "2026-01-02", "2026-01-03"]);
  });

  it("rolling genera una cuenta por día", () => {
    expect(replayRolling(days, rules)).toHaveLength(3);
  });
});
