export type DrawdownType = "none" | "static" | "eod" | "intraday";
export type RiskType = "fixed" | "percent";
export type RunOutcome = "passed" | "failed" | "incomplete";

export interface SimParams {
  runs: number;
  trades: number;
  tradesPerDay: number;
  /** 0..1 */
  winRate: number;
  /** ganancia media / pérdida media */
  payoff: number;
  startEquity: number;
  riskType: RiskType;
  /** $ por trade (fixed) o % de equity (percent) */
  risk: number;
  /** percent: true = % sobre equity actual, false = % sobre equity inicial */
  compound: boolean;
  drawdownType: DrawdownType;
  drawdownSize: number;
  /** el suelo trailing deja de subir cuando alcanza el balance inicial */
  lockAtStart: boolean;
  /** 0 = sin objetivo */
  profitTarget: number;
  /** 0 = sin límite; al alcanzarlo se deja de operar el resto del día */
  dailyLossLimit: number;
  seed: number;
  /** coste de comprar la prueba ($) */
  evalCost: number;
  /** coste de activar la cuenta fondeada ($), se paga solo al pasar */
  activationCost: number;
  /** trades que se opera la cuenta fondeada */
  fundedTrades: number;
  /** equity que se retira en cada cobro ($); 0 = no simular fondeada */
  payoutAmount: number;
  /** beneficio acumulado mínimo para poder cobrar ($) */
  payoutThreshold: number;
  /** % del retiro que recibe el trader */
  traderSplitPct: number;
  /** cuentas que se operan a la vez (lote) para calcular el breakeven en días */
  parallelAccounts: number;
  /**
   * Fondeada: beneficio acumulado al que el suelo trailing deja de subir (p. ej. Apex: 2600).
   * El suelo queda fijo en inicial + este valor − drawdown. 0 = misma regla que la prueba.
   */
  fundedLockProfit: number;
}

export interface RunResult {
  /** resultado de la prueba */
  outcome: RunOutcome;
  finalEquity: number;
  maxDrawdown: number;
  tradesUsed: number;
  /** equity inicial + equity tras cada trade de la prueba */
  path: number[];
  funded: boolean;
  /** "failed" = se quemó la fondeada; "alive" = sigue viva al terminar */
  fundedOutcome: "failed" | "alive" | null;
  payoutCount: number;
  /** días desde la compra de la cuenta hasta cada cobro */
  payoutDays: number[];
  /** días que duró la prueba */
  evalDays: number;
  /** dinero que recibe el trader */
  cash: number;
  cost: number;
  net: number;
}

export interface SimSummary {
  runs: number;
  passedCount: number;
  failedCount: number;
  incompleteCount: number;
  passedPct: number;
  failedPct: number;
  incompletePct: number;
  profitablePct: number;
  meanFinal: number;
  medianFinal: number;
  p5Final: number;
  p95Final: number;
  bestFinal: number;
  worstFinal: number;
  medianMaxDrawdown: number;
  avgTradesToPass: number | null;
  avgTradesToFail: number | null;
  profitFactor: number;
  expectancyPerTrade: number;
  // fondeada y rentabilidad
  fundedCount: number;
  fundedWithPayoutCount: number;
  fundedWithPayoutPct: number;
  totalPayouts: number;
  avgPayoutsPerFunded: number;
  avgCashPerAccount: number;
  avgCostPerAccount: number;
  avgNetPerAccount: number;
  totalNet: number;
  roiPct: number;
  avgDaysToFund: number | null;
  medianDaysToFirstPayout: number | null;
  avgDaysToFirstPayout: number | null;
  /** cuentas compradas hasta que el neto acumulado queda en positivo para siempre; null = nunca */
  accountsToBreakeven: number | null;
  batchSize: number;
  batchCount: number;
  batchBreakevenPct: number;
  medianBatchBreakevenDays: number | null;
  /** costo acumulado (pruebas + activaciones, incluidas las quemadas) hasta el primer cobro; null = ningún cobro */
  sunkCostAvg: number | null;
  sunkCostMedian: number | null;
  /** cuentas compradas hasta conseguir un cobro */
  accountsToFirstPayoutAvg: number | null;
  /** lo que recibes en el primer cobro */
  firstPayoutCash: number;
}

export function profitFactorToPayoff(pf: number, winRate: number): number {
  if (winRate <= 0 || winRate >= 1) return 0;
  return (pf * (1 - winRate)) / winRate;
}

export function payoffToProfitFactor(payoff: number, winRate: number): number {
  if (winRate >= 1) return Infinity;
  if (winRate <= 0) return 0;
  return (payoff * winRate) / (1 - winRate);
}

/**
 * Paseo aleatorio intradía (solo drawdown "intraday" con riesgo fijo).
 * El día termina al tocar +ganancia (día ganador) o −pérdida (día perdedor). Cada paso sube con
 * probabilidad q, calibrada para que la probabilidad de cerrar ganador sea exactamente winRate.
 */
interface DayWalk {
  /** pasos hasta la barrera de pérdida */
  a: number;
  /** pasos hasta la barrera de ganancia */
  b: number;
  q: number;
  /** $ por paso */
  unit: number;
  win: number;
  loss: number;
}

const WALK_STEPS = 15;

/** P(tocar +b antes que −a) para un paseo con prob. q de subir */
function upProbability(q: number, a: number, b: number): number {
  const r = (1 - q) / q;
  if (Math.abs(r - 1) < 1e-9) return a / (a + b);
  return (1 - Math.pow(r, a)) / (1 - Math.pow(r, a + b));
}

function makeDayWalk(p: SimParams): DayWalk | null {
  if (p.drawdownType !== "intraday" || p.riskType !== "fixed") return null;
  if (p.risk <= 0 || p.payoff <= 0 || p.winRate <= 0 || p.winRate >= 1) return null;
  const win = p.risk * p.payoff;
  const loss = p.risk;
  const unit = win / WALK_STEPS;
  const a = Math.max(1, Math.round(loss / unit));
  const b = WALK_STEPS;
  let lo = 0.05;
  let hi = 0.95;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (upProbability(mid, a, b) < p.winRate) lo = mid;
    else hi = mid;
  }
  return { a, b, q: (lo + hi) / 2, unit, win, loss };
}

export function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface PhaseConfig {
  maxTrades: number;
  /** 0 = sin objetivo */
  target: number;
  payout: { threshold: number; amount: number } | null;
  /** beneficio al que se detiene el trailing; 0 = usar lockAtStart */
  lockProfit: number;
}

interface PhaseResult {
  outcome: RunOutcome;
  finalEquity: number;
  maxDrawdown: number;
  tradesUsed: number;
  path: number[];
  payouts: number;
  withdrawn: number;
  days: number;
  payoutDays: number[];
}

function simulatePhase(
  p: SimParams,
  rng: () => number,
  cfg: PhaseConfig,
  walk: DayWalk | null
): PhaseResult {
  const start = p.startEquity;
  const target = cfg.target > 0 ? start + cfg.target : Infinity;
  const tpd = Math.max(1, Math.floor(p.tradesPerDay));
  const trailing = p.drawdownType === "eod" || p.drawdownType === "intraday";
  const floorFor = (peak: number) => {
    if (p.drawdownType === "static") return start - p.drawdownSize;
    if (trailing) {
      const f = peak - p.drawdownSize;
      if (cfg.lockProfit > 0) return Math.min(f, start + cfg.lockProfit - p.drawdownSize);
      return p.lockAtStart ? Math.min(f, start) : f;
    }
    return 0; // sin drawdown: solo ruina total
  };

  let equity = start;
  let peak = start; // pico usado para el suelo (EOD o intradía según tipo)
  let runPeak = start; // pico real, para medir el drawdown máximo
  let maxDrawdown = 0;
  let dayPnl = 0;
  let dayTrades = 0;
  let payouts = 0;
  let withdrawn = 0;
  let dayCount = 0;
  let endedMidDay = false;
  const payoutDays: number[] = [];
  let outcome: RunOutcome = "incomplete";
  const path = [start];

  for (let i = 0; i < cfg.maxTrades; i++) {
    const dayBlocked = p.dailyLossLimit > 0 && dayPnl <= -p.dailyLossLimit;
    if (!dayBlocked) {
      const base =
        p.riskType === "fixed" ? p.risk : (p.risk / 100) * (p.compound ? equity : start);
      const risk = Math.max(0, base);
      let pnl: number;
      if (walk) {
        // Monte Carlo intradía: el suelo persigue el pico que alcanza el paseo durante el día
        // y el día puede quemarse a mitad de camino aunque fuese a cerrar ganador.
        let pos = 0;
        while (pos > -walk.a && pos < walk.b) {
          pos += rng() < walk.q ? 1 : -1;
          const eq = equity + pos * walk.unit;
          if (eq > peak) peak = eq;
          if (eq <= floorFor(peak)) break;
        }
        pnl = pos >= walk.b ? walk.win : pos <= -walk.a ? -walk.loss : pos * walk.unit;
      } else {
        pnl = rng() < p.winRate ? risk * p.payoff : -risk;
      }
      equity += pnl;
      dayPnl += pnl;
      path.push(equity);

      if (equity > runPeak) runPeak = equity;
      maxDrawdown = Math.max(maxDrawdown, runPeak - equity);
      if (p.drawdownType === "intraday" && equity > peak) peak = equity;

      if (equity <= floorFor(peak) || equity <= 0) {
        outcome = "failed";
        endedMidDay = true;
        break;
      }
      if (p.drawdownType !== "eod" && equity >= target) {
        outcome = "passed";
        endedMidDay = true;
        break;
      }
    }

    dayTrades++;
    if (dayTrades >= tpd) {
      // cierre de día
      dayCount++;
      if (p.drawdownType === "eod" && equity > peak) peak = equity;
      if (p.drawdownType === "eod" && equity >= target) {
        outcome = "passed";
        break;
      }
      if (
        cfg.payout &&
        equity - start >= cfg.payout.threshold &&
        equity - cfg.payout.amount > floorFor(peak)
      ) {
        equity -= cfg.payout.amount;
        withdrawn += cfg.payout.amount;
        payouts++;
        payoutDays.push(dayCount);
        runPeak = equity; // el retiro no cuenta como drawdown
      }
      dayPnl = 0;
      dayTrades = 0;
    }
  }

  if (outcome === "incomplete" && p.drawdownType === "eod" && equity >= target) {
    outcome = "passed";
  }

  return {
    outcome,
    finalEquity: equity,
    maxDrawdown,
    tradesUsed: path.length - 1,
    path,
    payouts,
    withdrawn,
    days: dayCount + (endedMidDay || dayTrades > 0 ? 1 : 0),
    payoutDays,
  };
}

function simulateAccount(p: SimParams, rng: () => number, walk: DayWalk | null): RunResult {
  const evalRun = simulatePhase(p, rng, {
    maxTrades: p.trades,
    target: p.profitTarget,
    payout: null,
    lockProfit: 0,
  }, walk);

  const funded = evalRun.outcome === "passed";
  let fundedOutcome: RunResult["fundedOutcome"] = null;
  let payoutCount = 0;
  let payoutDays: number[] = [];
  let cash = 0;

  if (funded && p.payoutAmount > 0) {
    const f = simulatePhase(p, rng, {
      maxTrades: p.fundedTrades,
      target: 0,
      payout: { threshold: p.payoutThreshold, amount: p.payoutAmount },
      lockProfit: p.fundedLockProfit,
    }, walk);
    fundedOutcome = f.outcome === "failed" ? "failed" : "alive";
    payoutCount = f.payouts;
    payoutDays = f.payoutDays.map((d) => d + evalRun.days);
    cash = (f.withdrawn * p.traderSplitPct) / 100;
  }

  const cost = p.evalCost + (funded ? p.activationCost : 0);
  return {
    outcome: evalRun.outcome,
    finalEquity: evalRun.finalEquity,
    maxDrawdown: evalRun.maxDrawdown,
    tradesUsed: evalRun.tradesUsed,
    path: evalRun.path,
    funded,
    fundedOutcome,
    payoutCount,
    payoutDays,
    evalDays: evalRun.days,
    cash,
    cost,
    net: cash - cost,
  };
}

export function runSimulation(p: SimParams): RunResult[] {
  const rng = mulberry32(p.seed);
  const results: RunResult[] = [];
  const walk = makeDayWalk(p);
  for (let r = 0; r < p.runs; r++) results.push(simulateAccount(p, rng, walk));
  return results;
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

function mean(values: number[]): number {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  return quantile([...values].sort((a, b) => a - b), 0.5);
}

/** Lotes de cuentas compradas a la vez: día en que los cobros acumulados cubren el coste del lote. */
function batchBreakeven(results: RunResult[], size: number) {
  const days: number[] = [];
  let batches = 0;
  for (let i = 0; i + size <= results.length; i += size) {
    batches++;
    const batch = results.slice(i, i + size);
    const cost = batch.reduce((a, r) => a + r.cost, 0);
    const events = batch.flatMap((r) => {
      const each = r.payoutCount > 0 ? r.cash / r.payoutCount : 0;
      return r.payoutDays.map((d) => ({ day: d, cash: each }));
    });
    events.sort((a, b) => a.day - b.day);
    let cum = 0;
    for (const e of events) {
      cum += e.cash;
      if (cum >= cost) {
        days.push(e.day);
        break;
      }
    }
  }
  return { batches, reached: days.length, medianDays: median(days) };
}

/** Compra cuentas en secuencia: cada tramo termina en la primera cuenta que cobra. */
function sunkCostSegments(results: RunResult[]) {
  const costs: number[] = [];
  const accounts: number[] = [];
  let cost = 0;
  let count = 0;
  for (const r of results) {
    cost += r.cost;
    count++;
    if (r.payoutCount > 0) {
      costs.push(cost);
      accounts.push(count);
      cost = 0;
      count = 0;
    }
  }
  return { costs, accounts };
}

export function summarize(results: RunResult[], p: SimParams): SimSummary {
  const n = results.length || 1;
  const finals = results.map((r) => r.finalEquity).sort((a, b) => a - b);
  const dds = results.map((r) => r.maxDrawdown).sort((a, b) => a - b);
  const passed = results.filter((r) => r.outcome === "passed");
  const failed = results.filter((r) => r.outcome === "failed");
  const incompleteCount = results.length - passed.length - failed.length;
  const risk = p.riskType === "fixed" ? p.risk : (p.risk / 100) * p.startEquity;
  const expectancyPerTrade = risk * (p.winRate * p.payoff - (1 - p.winRate));

  const funded = results.filter((r) => r.funded);
  const withPayout = funded.filter((r) => r.payoutCount > 0);
  const totalPayouts = results.reduce((a, r) => a + r.payoutCount, 0);
  const totalCash = results.reduce((a, r) => a + r.cash, 0);
  const totalCost = results.reduce((a, r) => a + r.cost, 0);

  const firstPayoutDays = results.filter((r) => r.payoutDays.length > 0).map((r) => r.payoutDays[0]);
  const batchSize = Math.max(1, Math.floor(p.parallelAccounts));
  const batch = batchBreakeven(results, batchSize);
  let acc = 0;
  let lastNegative = 0;
  results.forEach((r, i) => {
    acc += r.net;
    if (acc < 0) lastNegative = i + 1;
  });
  const sunk = sunkCostSegments(results);
  const accountsToBreakeven = lastNegative >= results.length ? null : lastNegative + 1;

  return {
    runs: results.length,
    passedCount: passed.length,
    failedCount: failed.length,
    incompleteCount,
    passedPct: (passed.length / n) * 100,
    failedPct: (failed.length / n) * 100,
    incompletePct: (incompleteCount / n) * 100,
    profitablePct: (finals.filter((f) => f > p.startEquity).length / n) * 100,
    meanFinal: mean(finals),
    medianFinal: quantile(finals, 0.5),
    p5Final: quantile(finals, 0.05),
    p95Final: quantile(finals, 0.95),
    bestFinal: finals[finals.length - 1] ?? 0,
    worstFinal: finals[0] ?? 0,
    medianMaxDrawdown: quantile(dds, 0.5),
    avgTradesToPass: passed.length ? mean(passed.map((r) => r.tradesUsed)) : null,
    avgTradesToFail: failed.length ? mean(failed.map((r) => r.tradesUsed)) : null,
    profitFactor: payoffToProfitFactor(p.payoff, p.winRate),
    expectancyPerTrade,
    fundedCount: funded.length,
    fundedWithPayoutCount: withPayout.length,
    fundedWithPayoutPct: funded.length ? (withPayout.length / funded.length) * 100 : 0,
    totalPayouts,
    avgPayoutsPerFunded: funded.length ? totalPayouts / funded.length : 0,
    avgCashPerAccount: totalCash / n,
    avgCostPerAccount: totalCost / n,
    avgNetPerAccount: (totalCash - totalCost) / n,
    totalNet: totalCash - totalCost,
    roiPct: totalCost > 0 ? ((totalCash - totalCost) / totalCost) * 100 : 0,
    avgDaysToFund: funded.length ? mean(funded.map((r) => r.evalDays)) : null,
    medianDaysToFirstPayout: median(firstPayoutDays),
    avgDaysToFirstPayout: firstPayoutDays.length ? mean(firstPayoutDays) : null,
    accountsToBreakeven,
    batchSize,
    batchCount: batch.batches,
    batchBreakevenPct: batch.batches ? (batch.reached / batch.batches) * 100 : 0,
    medianBatchBreakevenDays: batch.medianDays,
    sunkCostAvg: sunk.costs.length ? mean(sunk.costs) : null,
    sunkCostMedian: median(sunk.costs),
    accountsToFirstPayoutAvg: sunk.accounts.length ? mean(sunk.accounts) : null,
    firstPayoutCash: (p.payoutAmount * p.traderSplitPct) / 100,
  };
}
