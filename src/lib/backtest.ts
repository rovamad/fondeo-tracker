import { summarize, type RunResult, type SimParams, type SimSummary } from "./simulator";

/** Un día del reporte de operaciones (NinjaTrader Grid, periodo diario). */
export interface HistoryDay {
  /** ISO yyyy-mm-dd */
  date: string;
  /** resultado neto del día ($) */
  net: number;
  /** peor drawdown dentro del día ($, <= 0) */
  maxDrawdown: number;
  trades: number;
}

export interface HistoryStats {
  days: number;
  from: string;
  to: string;
  totalNet: number;
  winDaysPct: number;
  profitFactor: number;
  avgDay: number;
  avgWinDay: number;
  avgLossDay: number;
  bestDay: number;
  worstDay: number;
  worstIntradayDrawdown: number;
  totalTrades: number;
}

export interface BacktestAccount extends RunResult {
  startDate: string;
  endDate: string;
  /** días del histórico que consumió la cuenta (prueba + fondeada) */
  daysUsed: number;
}

/**
 * Tramo del plan de trading: `days` días seguidos de una fase en los que un día ganador del
 * reporte se cuenta como `value` fijo ($) o como `value` veces su resultado real.
 */
export interface PlanStep {
  mode: "fixed" | "multiply";
  value: number;
  days: number;
}

/** Plan virtual: tramos por fase, empezando en el primer día de cada fase. */
export interface TradingPlan {
  eval: PlanStep[];
  funded: PlanStep[];
}

/** Aplica el tramo que toque al día `index` (0 = primer día de la fase). Solo toca días ganadores. */
export function applyPlan(day: HistoryDay, index: number, steps: PlanStep[] | undefined): HistoryDay {
  if (!steps || day.net <= 0) return day;
  let left = index;
  for (const s of steps) {
    const n = Math.max(0, Math.floor(s.days));
    if (left < n) {
      const net = s.mode === "fixed" ? s.value : day.net * s.value;
      return { ...day, net };
    }
    left -= n;
  }
  return day;
}

// ---------------------------------------------------------------- parseo

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (quoted && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === "," && !quoted) {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function parseMoney(raw: string | undefined): number {
  if (!raw) return 0;
  const neg = /^\(.*\)$/.test(raw.trim()) || raw.includes("-");
  const n = Number(raw.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(n)) return NaN;
  return neg ? -n : n;
}

/** d/m/yyyy (NinjaTrader en español) o yyyy-mm-dd */
function parseDate(raw: string): string | null {
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(raw);
  const dmy = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/.exec(raw);
  let y: number, m: number, d: number;
  if (iso) [y, m, d] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
  else if (dmy) [d, m, y] = [Number(dmy[1]), Number(dmy[2]), Number(dmy[3])];
  else return null;
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/**
 * Lee el CSV exportado desde el Grid de NinjaTrader con Period = Day.
 * Usa las columnas "Period", "Net profit", "Max. drawdown" y "#".
 */
export function parseNinjaTraderReport(text: string): HistoryDay[] {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length < 2) throw new Error("El archivo está vacío.");
  const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
  const col = (name: string) => header.indexOf(name);
  const iDate = col("period");
  const iNet = col("net profit");
  const iDd = col("max. drawdown");
  const iTrades = col("#");
  const missing = [
    iDate < 0 && "Period",
    iNet < 0 && "Net profit",
    iDd < 0 && "Max. drawdown",
  ].filter(Boolean);
  if (missing.length) {
    throw new Error(
      `Faltan columnas: ${missing.join(", ")}. Exporta el Grid de NinjaTrader con Period = Day.`
    );
  }

  const byDate = new Map<string, HistoryDay>();
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    const date = parseDate(cells[iDate] ?? "");
    if (!date) {
      throw new Error(
        `Fila ${i + 1}: "${cells[iDate] ?? ""}" no es un día. El reporte debe ser por día (Period = Day).`
      );
    }
    const net = parseMoney(cells[iNet]);
    const dd = parseMoney(cells[iDd]);
    if (Number.isNaN(net) || Number.isNaN(dd)) throw new Error(`Fila ${i + 1}: importe no válido.`);
    const day: HistoryDay = {
      date,
      net,
      maxDrawdown: Math.min(0, dd),
      trades: iTrades >= 0 ? Number(cells[iTrades]) || 0 : 0,
    };
    byDate.set(date, day);
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function historyStats(days: HistoryDay[]): HistoryStats {
  const wins = days.filter((d) => d.net > 0);
  const losses = days.filter((d) => d.net < 0);
  const gross = wins.reduce((a, d) => a + d.net, 0);
  const lossSum = -losses.reduce((a, d) => a + d.net, 0);
  const totalNet = days.reduce((a, d) => a + d.net, 0);
  return {
    days: days.length,
    from: days[0]?.date ?? "",
    to: days[days.length - 1]?.date ?? "",
    totalNet,
    winDaysPct: days.length ? (wins.length / days.length) * 100 : 0,
    profitFactor: lossSum > 0 ? gross / lossSum : gross > 0 ? Infinity : 0,
    avgDay: days.length ? totalNet / days.length : 0,
    avgWinDay: wins.length ? gross / wins.length : 0,
    avgLossDay: losses.length ? -lossSum / losses.length : 0,
    bestDay: Math.max(0, ...days.map((d) => d.net)),
    worstDay: Math.min(0, ...days.map((d) => d.net)),
    worstIntradayDrawdown: Math.min(0, ...days.map((d) => d.maxDrawdown)),
    totalTrades: days.reduce((a, d) => a + d.trades, 0),
  };
}

// ---------------------------------------------------------------- motor

type BacktestParams = Pick<
  SimParams,
  | "startEquity"
  | "drawdownType"
  | "drawdownSize"
  | "lockAtStart"
  | "profitTarget"
  | "dailyLossLimit"
  | "trades"
  | "fundedTrades"
  | "evalCost"
  | "activationCost"
  | "payoutAmount"
  | "payoutThreshold"
  | "traderSplitPct"
  | "fundedLockProfit"
  | "maxPayouts"
> & { plan?: TradingPlan };

interface PhaseOut {
  outcome: "passed" | "failed" | "incomplete";
  /** días consumidos (desde `from`) */
  used: number;
  path: number[];
  equity: number;
  maxDrawdown: number;
  withdrawn: number;
  payoutDays: number[];
}

/**
 * Reproduce una fase (prueba o fondeada) sobre el histórico a partir de `from`.
 * Dentro del día se asume el peor caso conocido: mínimo = inicio + min(neto, maxDD del día),
 * máximo = inicio + max(neto, 0). Con trailing intradía el suelo se calcula con el pico
 * anterior al día y la quema se comprueba antes que el objetivo.
 */
function replayPhase(
  days: HistoryDay[],
  from: number,
  p: BacktestParams,
  cfg: {
    maxDays: number;
    target: number;
    payout: { threshold: number; amount: number } | null;
    lockProfit: number;
    steps?: PlanStep[];
  }
): PhaseOut {
  const start = p.startEquity;
  const target = cfg.target > 0 ? start + cfg.target : Infinity;
  const trailing = p.drawdownType === "eod" || p.drawdownType === "intraday";
  const floorFor = (peak: number) => {
    if (p.drawdownType === "static") return start - p.drawdownSize;
    if (trailing) {
      const f = peak - p.drawdownSize;
      if (cfg.lockProfit > 0) return Math.min(f, start + cfg.lockProfit - p.drawdownSize);
      return p.lockAtStart ? Math.min(f, start) : f;
    }
    return 0;
  };

  let equity = start;
  let peak = start;
  let runPeak = start;
  let maxDrawdown = 0;
  let withdrawn = 0;
  let outcome: PhaseOut["outcome"] = "incomplete";
  const payoutDays: number[] = [];
  const path = [start];
  let used = 0;
  const last = Math.min(days.length, from + cfg.maxDays);

  for (let i = from; i < last; i++) {
    const d = applyPlan(days[i], i - from, cfg.steps);
    used++;
    const dayStart = equity;
    // límite de pérdida diaria: se corta el día al alcanzarlo
    let net = d.net;
    let low = dayStart + Math.min(d.net, d.maxDrawdown);
    if (p.dailyLossLimit > 0 && low <= dayStart - p.dailyLossLimit) {
      // se habría dejado de operar al tocar el límite: el día cierra en el límite
      net = -p.dailyLossLimit;
      low = dayStart - p.dailyLossLimit;
    }
    equity = dayStart + net;
    path.push(equity);
    runPeak = Math.max(runPeak, equity);
    maxDrawdown = Math.max(maxDrawdown, runPeak - Math.min(low, equity));

    if (p.drawdownType === "intraday") {
      // quema en cualquier punto del día contra el pico previo
      if (low <= floorFor(peak) || low <= 0) {
        outcome = "failed";
        break;
      }
      peak = Math.max(peak, equity);
      if (equity <= floorFor(peak)) {
        outcome = "failed";
        break;
      }
      if (equity >= target) {
        outcome = "passed";
        break;
      }
    } else {
      if (low <= floorFor(peak) || low <= 0) {
        outcome = "failed";
        break;
      }
      if (p.drawdownType === "eod") {
        peak = Math.max(peak, equity);
        if (equity >= target) {
          outcome = "passed";
          break;
        }
      } else if (equity >= target) {
        outcome = "passed";
        break;
      }
    }

    if (
      cfg.payout &&
      equity - start >= cfg.payout.threshold &&
      equity - cfg.payout.amount > floorFor(peak)
    ) {
      equity -= cfg.payout.amount;
      withdrawn += cfg.payout.amount;
      payoutDays.push(used);
      runPeak = equity;
      // con el límite de cobros alcanzado la cuenta se cierra
      if (p.maxPayouts > 0 && payoutDays.length >= p.maxPayouts) break;
    }
  }

  return { outcome, used, path, equity, maxDrawdown, withdrawn, payoutDays };
}

/** Una cuenta comprada el día `from`: prueba y, si pasa, fondeada. */
export function replayAccount(days: HistoryDay[], from: number, p: BacktestParams): BacktestAccount {
  const ev = replayPhase(days, from, p, {
    maxDays: p.trades,
    target: p.profitTarget,
    payout: null,
    lockProfit: 0,
    steps: p.plan?.eval,
  });
  const funded = ev.outcome === "passed";
  let fundedOutcome: RunResult["fundedOutcome"] = null;
  let payoutCount = 0;
  let payoutDays: number[] = [];
  let cash = 0;
  let fundedUsed = 0;

  if (funded && p.payoutAmount > 0) {
    const f = replayPhase(days, from + ev.used, p, {
      maxDays: p.fundedTrades,
      target: 0,
      payout: { threshold: p.payoutThreshold, amount: p.payoutAmount },
      lockProfit: p.fundedLockProfit,
      steps: p.plan?.funded,
    });
    fundedUsed = f.used;
    fundedOutcome = f.outcome === "failed" ? "failed" : "alive";
    payoutCount = f.payoutDays.length;
    payoutDays = f.payoutDays.map((d) => d + ev.used);
    cash = (f.withdrawn * p.traderSplitPct) / 100;
  }

  const cost = p.evalCost + (funded ? p.activationCost : 0);
  const daysUsed = Math.max(1, ev.used + fundedUsed);
  return {
    outcome: ev.outcome,
    finalEquity: ev.equity,
    maxDrawdown: ev.maxDrawdown,
    tradesUsed: ev.used,
    path: ev.path,
    funded,
    fundedOutcome,
    payoutCount,
    payoutDays,
    evalDays: ev.used,
    cash,
    cost,
    net: cash - cost,
    startDate: days[from].date,
    endDate: days[Math.min(days.length - 1, from + daysUsed - 1)].date,
    daysUsed,
  };
}

/** Compra una cuenta nueva en cuanto termina la anterior, de principio a fin del histórico. */
export function replaySequential(days: HistoryDay[], p: BacktestParams): BacktestAccount[] {
  const out: BacktestAccount[] = [];
  let i = 0;
  while (i < days.length) {
    const a = replayAccount(days, i, p);
    out.push(a);
    i += a.daysUsed;
  }
  return out;
}

/** Una cuenta nueva cada día del histórico (todas las fechas de inicio posibles). */
export function replayRolling(days: HistoryDay[], p: BacktestParams): BacktestAccount[] {
  return days.map((_, i) => replayAccount(days, i, p));
}

/** Resumen reutilizando el de la simulación, con las estadísticas reales del reporte. */
export function summarizeBacktest(
  accounts: BacktestAccount[],
  p: SimParams,
  stats: HistoryStats
): SimSummary {
  const s = summarize(accounts, p);
  return { ...s, profitFactor: stats.profitFactor, expectancyPerTrade: stats.avgDay };
}
