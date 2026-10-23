"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { KpiCard } from "@/components/KpiCard";
import { ReportBacktest } from "@/components/ReportBacktest";
import { formatCurrency, formatPct } from "@/lib/format";
import { useStoredState } from "@/lib/useStoredState";
import {
  payoffToProfitFactor,
  profitFactorToPayoff,
  runSimulation,
  summarize,
  type DrawdownType,
  type SimParams,
} from "@/lib/simulator";

const MAX_DRAWN_PATHS = 100;

const COLORS = {
  passed: "#22c55e",
  failed: "#ef4444",
  incomplete: "#6b7a99",
};

interface SimulatorProps {
  /** Retiros / gastos del tracker; null si no hay gastos registrados */
  trackerRatio: number | null;
}

type EdgeMode = "pf" | "payoff";

function NumberField({
  label,
  value,
  onChange,
  step = 1,
  min = 0,
  hint,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <label className={`flex flex-col gap-1 text-sm ${disabled ? "opacity-40" : ""}`}>
      <span className="text-xs uppercase tracking-wide text-muted">{label}</span>
      <input
        type="number"
        value={Number.isFinite(value) ? value : ""}
        min={min}
        step={step}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
        className="rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-accent"
      />
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded-md px-3 py-2 text-sm transition-colors ${
            value === o.value
              ? "bg-accent/15 font-medium text-accent"
              : "bg-background text-muted hover:bg-surface-hover hover:text-foreground"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
      <h2 className="text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function resolvePayoff(
  mode: EdgeMode,
  pf: number,
  winRate: number,
  winAmount: number,
  lossAmount: number
): number {
  if (mode === "pf") return profitFactorToPayoff(pf, winRate);
  return lossAmount > 0 ? winAmount / lossAmount : 0;
}

export function Simulator({ trackerRatio }: SimulatorProps) {
  const [runs, setRuns] = useStoredState("sim.runs", 2000);
  const [trades, setTrades] = useStoredState("sim.trades", 100);
  const [winRatePct, setWinRatePct] = useStoredState("sim.winRatePct", 70);
  const [edgeMode, setEdgeMode] = useStoredState<EdgeMode>("sim.edgeMode", "payoff");
  const [profitFactor, setProfitFactor] = useStoredState("sim.profitFactor", 1.5);
  const [winAmount, setWinAmount] = useStoredState("sim.winAmount", 600);
  const [startEquity, setStartEquity] = useStoredState("sim.startEquity", 50000);
  const [lossAmount, setLossAmount] = useStoredState("sim.lossAmount", 2000);
  const [drawdownType, setDrawdownType] = useStoredState<DrawdownType>("sim.drawdownType", "intraday");
  const [drawdownSize, setDrawdownSize] = useStoredState("sim.drawdownSize", 2000);
  const [lockAtStart, setLockAtStart] = useStoredState("sim.lockAtStart", true);
  const [profitTarget, setProfitTarget] = useStoredState("sim.profitTarget", 3000);
  const [evalCost, setEvalCost] = useStoredState("sim.evalCost", 100);
  const [activationCost, setActivationCost] = useStoredState("sim.activationCost", 0);
  const [fundedTrades, setFundedTrades] = useStoredState("sim.fundedTrades", 100);
  const [payoutAmount, setPayoutAmount] = useStoredState("sim.payoutAmount", 1500);
  const [payoutThreshold, setPayoutThreshold] = useStoredState("sim.payoutThreshold", 1500);
  const [traderSplitPct, setTraderSplitPct] = useStoredState("sim.traderSplitPct", 100);
  const [parallelAccounts, setParallelAccounts] = useStoredState("sim.parallelAccounts", 10);
  const [maxPayouts, setMaxPayouts] = useStoredState("sim.maxPayouts", 4);
  const [fundedLockProfit, setFundedLockProfit] = useStoredState("sim.fundedLockProfit", 0);
  const [seed, setSeed] = useStoredState("sim.seed", 1);

  const winRate = Math.min(0.99, Math.max(0.01, winRatePct / 100));
  const payoff = resolvePayoff(edgeMode, profitFactor, winRate, winAmount, lossAmount);
  const effectivePf = payoffToProfitFactor(payoff, winRate);
  const effectiveWin = payoff * lossAmount;

  const params: SimParams = useMemo(
    () => ({
      runs: Math.min(2000, Math.max(1, Math.floor(runs))),
      trades: Math.min(2000, Math.max(1, Math.floor(trades))),
      tradesPerDay: 1, // cada resultado del motor es un día completo
      winRate,
      payoff: resolvePayoff(edgeMode, profitFactor, winRate, winAmount, lossAmount),
      startEquity,
      riskType: "fixed",
      risk: lossAmount,
      compound: false,
      drawdownType,
      drawdownSize,
      lockAtStart,
      profitTarget,
      dailyLossLimit: 0,
      seed,
      evalCost,
      activationCost,
      fundedTrades: Math.min(2000, Math.max(1, Math.floor(fundedTrades))),
      payoutAmount,
      payoutThreshold,
      traderSplitPct,
      parallelAccounts: Math.min(500, Math.max(1, Math.floor(parallelAccounts))),
      fundedLockProfit,
      maxPayouts: Math.max(0, Math.floor(maxPayouts)),
    }),
    [
      runs, trades, winRate, edgeMode, profitFactor, winAmount, startEquity, lossAmount,
      drawdownType, drawdownSize, lockAtStart, profitTarget, seed,
      evalCost, activationCost, fundedTrades, payoutAmount, payoutThreshold, traderSplitPct, parallelAccounts, fundedLockProfit, maxPayouts,
    ]
  );

  const { results, summary, chartData, drawn, netData } = useMemo(() => {
    const results = runSimulation(params);
    const summary = summarize(results, params);
    const drawn = results.slice(0, MAX_DRAWN_PATHS);
    const len = Math.max(...drawn.map((r) => r.path.length));
    const chartData = Array.from({ length: len }, (_, i) => {
      const row: Record<string, number> = { day: i };
      drawn.forEach((r, k) => {
        if (i < r.path.length) row[`r${k}`] = Math.round(r.path[i]);
      });
      return row;
    });
    const netData: {
      account: number;
      real: number;
      esperado: number;
      costos: number;
      cobros: number;
    }[] = [];
    let acc = 0;
    let accCost = 0;
    let accCash = 0;
    for (let i = 0; i < results.length; i++) {
      acc += results[i].net;
      accCost += results[i].cost;
      accCash += results[i].cash;
      netData.push({
        account: i + 1,
        real: Math.round(acc),
        esperado: Math.round(summary.avgNetPerAccount * (i + 1)),
        costos: Math.round(accCost),
        cobros: Math.round(accCash),
      });
    }
    return { results, summary, chartData, drawn, netData };
  }, [params]);

  const hasTarget = profitTarget > 0;
  const hasDd = drawdownType !== "none";
  const edgePositive = summary.expectancyPerTrade > 0;
  const riskDesc = `gana ${formatCurrency(effectiveWin)} / pierde ${formatCurrency(lossAmount)}`;

  return (
    <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
      <div className="flex flex-col gap-4">
        <Group title="Tus estadísticas (por día)">
          <NumberField
            label="Días ganadores (%)"
            value={winRatePct}
            onChange={setWinRatePct}
            step={1}
            hint="Ej.: si quemas 3 de cada 10 cuentas al día, son 70%"
          />
          <Segmented
            value={edgeMode}
            onChange={setEdgeMode}
            options={[
              { value: "payoff", label: "Ganancia y pérdida ($)" },
              { value: "pf", label: "Profit factor" },
            ]}
          />
          <div className="grid grid-cols-2 gap-3">
            {edgeMode === "pf" ? (
              <NumberField
                label="Profit factor"
                value={profitFactor}
                onChange={setProfitFactor}
                step={0.05}
                hint={`Día ganador = ${formatCurrency(effectiveWin)}`}
              />
            ) : (
              <NumberField
                label="Día ganador: gano ($)"
                value={winAmount}
                onChange={setWinAmount}
                step={50}
                hint={`Profit factor = ${effectivePf.toFixed(2)}`}
              />
            )}
            <NumberField
              label="Día perdedor: pierdo ($)"
              value={lossAmount}
              onChange={setLossAmount}
              step={100}
              hint="Lo que pierdes el día malo (p. ej. toda la cuenta)"
            />
          </div>
          {trackerRatio !== null && (
            <button
              type="button"
              onClick={() => {
                setEdgeMode("pf");
                setProfitFactor(Number(trackerRatio.toFixed(2)));
              }}
              className="rounded-md border border-border px-3 py-2 text-left text-xs text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
            >
              Usar el ratio retiros/gastos de tu tracker:{" "}
              <span className="font-medium text-foreground">{trackerRatio.toFixed(2)}</span>
              <span className="block">
                (es el PF del negocio de fondeo, no el de tus días de trading; úsalo solo si te sirve como referencia)
              </span>
            </button>
          )}
        </Group>

        <Group title="Cuenta">
          <NumberField label="Balance inicial ($)" value={startEquity} onChange={setStartEquity} step={1000} />
        </Group>

        <Group title="Reglas de la prop firm">
          <Segmented
            value={drawdownType}
            onChange={setDrawdownType}
            options={[
              { value: "none", label: "Sin DD" },
              { value: "static", label: "Estático" },
              { value: "eod", label: "EoD" },
              { value: "intraday", label: "Trailing" },
            ]}
          />
          <NumberField
            label="Drawdown máximo ($)"
            value={drawdownSize}
            onChange={setDrawdownSize}
            step={100}
            disabled={!hasDd}
          />
          {(drawdownType === "eod" || drawdownType === "intraday") && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={lockAtStart} onChange={(e) => setLockAtStart(e.target.checked)} />
              Bloquear el suelo en el balance inicial
            </label>
          )}
          <NumberField
            label="Objetivo de profit ($)"
            value={profitTarget}
            onChange={setProfitTarget}
            step={250}
            hint="0 = sin objetivo; la cuenta deja de operar al alcanzarlo"
          />
        </Group>

        <Group title="Fondeada y cobros">
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Coste prueba ($)" value={evalCost} onChange={setEvalCost} step={5} />
            <NumberField label="Activación ($)" value={activationCost} onChange={setActivationCost} step={5} hint="solo si pasas" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Importe por cobro ($)" value={payoutAmount} onChange={setPayoutAmount} step={100} hint="0 = no simular fondeada" />
            <NumberField label="Beneficio mín. para cobrar ($)" value={payoutThreshold} onChange={setPayoutThreshold} step={100} hint="Beneficio acumulado sobre el balance inicial (equity − inicial). Tras cobrar baja por el importe y vuelves a cobrar al llegar otra vez" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Tu % del retiro" value={traderSplitPct} onChange={setTraderSplitPct} step={5} />
            <NumberField label="Días en fondeada" value={fundedTrades} onChange={setFundedTrades} min={1} hint="Días que operas la cuenta fondeada (máx. 2000)" />
          </div>
          <NumberField
            label="DD fondeada: se detiene en beneficio ($)"
            value={fundedLockProfit}
            onChange={setFundedLockProfit}
            step={100}
            disabled={drawdownType !== "eod" && drawdownType !== "intraday"}
            hint="Beneficio al que el suelo trailing deja de subir (Apex: 2600; el suelo queda en ese valor − DD). 0 = igual que la prueba"
          />
          <NumberField
            label="Máx. cobros por cuenta"
            value={maxPayouts}
            onChange={setMaxPayouts}
            hint="Al llegar a este número de cobros la cuenta se cierra. 0 = sin límite"
          />
          <NumberField
            label="Cuentas en paralelo"
            value={parallelAccounts}
            onChange={setParallelAccounts}
            min={1}
            hint="Lote que compras a la vez; sirve para los días hasta breakeven"
          />
        </Group>

        <Group title="Simulación">
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Nº de cuentas simuladas" value={runs} onChange={setRuns} min={1} hint="máx. 2000" />
            <NumberField label="Días máx. de la prueba" value={trades} onChange={setTrades} min={1} hint="Si no alcanzas el objetivo ni quemas en esos días, queda sin resolver (máx. 2000)" />
          </div>
          <button
            type="button"
            onClick={() => setSeed((s) => s + 1)}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Simular de nuevo
          </button>
        </Group>
      </div>

      <div className="flex min-w-0 flex-col gap-4">
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <KpiCard
 compact
            label="Esperanza / trade"
            value={formatCurrency(summary.expectancyPerTrade)}
            hint={`PF ${summary.profitFactor.toFixed(2)} · ${riskDesc}`}
            tone={edgePositive ? "positive" : "negative"}
          />
          {hasTarget ? (
            <KpiCard
 compact
              label="Pasan la prueba"
              value={`${summary.passedCount} de ${summary.runs}`}
              hint={
                summary.avgTradesToPass !== null
                  ? `${formatPct(summary.passedPct)} · ≈ ${summary.avgTradesToPass.toFixed(0)} días`
                  : "Ninguna lo alcanzó"
              }
              tone="positive"
            />
          ) : (
            <KpiCard
 compact
              label="Terminan en ganancia"
              value={formatPct(summary.profitablePct)}
              hint="Equity final > balance inicial"
              tone="positive"
            />
          )}
          <KpiCard
 compact
            label="Queman la prueba"
            value={`${summary.failedCount} de ${summary.runs}`}
            hint={
              summary.avgTradesToFail !== null
                ? `${formatPct(summary.failedPct)} · ≈ ${summary.avgTradesToFail.toFixed(0)} días hasta quemar`
                : "Ninguna quebró"
            }
            tone={summary.failedPct > 0 ? "negative" : "neutral"}
          />
          <KpiCard
 compact
            label="Sin resolver"
            value={formatPct(summary.incompletePct)}
            hint={`Pasaron ${params.trades} días sin objetivo ni quema`}
          />
        </div>

        {hasTarget && payoutAmount > 0 && (
          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold">Rentabilidad por cuenta</h2>
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              <KpiCard
 compact
                label="Se fondean"
                value={`${summary.fundedCount} de ${summary.runs}`}
                hint="Pasaron la prueba"
              />
              <KpiCard
 compact
                label="Cobran al menos 1 vez"
                value={`${summary.fundedWithPayoutCount} de ${summary.fundedCount}`}
                hint={`${formatPct(summary.fundedWithPayoutPct)} de las fondeadas · ${summary.totalPayouts} cobros en total`}
                tone="positive"
              />
              <KpiCard
 compact
                label="Neto por cuenta"
                value={formatCurrency(summary.avgNetPerAccount)}
                hint={`Cobras ${formatCurrency(summary.avgCashPerAccount)} − pagas ${formatCurrency(summary.avgCostPerAccount)}`}
                tone={summary.avgNetPerAccount >= 0 ? "positive" : "negative"}
              />
              <KpiCard
 compact
                label="ROI esperado"
                value={formatPct(summary.roiPct, 0)}
                hint={`Neto de ${summary.runs} cuentas: ${formatCurrency(summary.totalNet)}`}
                tone={summary.roiPct >= 0 ? "positive" : "negative"}
              />
            </div>
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-3 xl:grid-cols-5">
              <KpiCard
 compact
                label="Costo hundido hasta cobrar"
                value={summary.sunkCostAvg !== null ? formatCurrency(summary.sunkCostAvg) : "—"}
                hint={
                  summary.sunkCostAvg !== null
                    ? `≈ ${summary.accountsToFirstPayoutAvg!.toFixed(1)} cuentas compradas (mediana ${formatCurrency(summary.sunkCostMedian ?? 0)}) · el 1er cobro te da ${formatCurrency(summary.firstPayoutCash)}`
                    : "Ninguna cuenta cobró"
                }
                tone={
                  summary.sunkCostAvg !== null && summary.sunkCostAvg > summary.firstPayoutCash
                    ? "negative"
                    : "neutral"
                }
              />
              <KpiCard
 compact
                label="Días hasta fondearse"
                value={summary.avgDaysToFund !== null ? `${summary.avgDaysToFund.toFixed(1)} d` : "—"}
                hint="Media de las que pasan la prueba"
              />
              <KpiCard
 compact
                label="Días hasta el 1er cobro"
                value={
                  summary.medianDaysToFirstPayout !== null
                    ? `${summary.medianDaysToFirstPayout.toFixed(0)} d`
                    : "—"
                }
                hint={
                  summary.avgDaysToFirstPayout !== null
                    ? `Mediana desde la compra · media ${summary.avgDaysToFirstPayout.toFixed(1)} d`
                    : "Ninguna cobró"
                }
              />
              <KpiCard
 compact
                label={`Breakeven de ${summary.batchSize} cuentas`}
                value={
                  summary.medianBatchBreakevenDays !== null
                    ? `${summary.medianBatchBreakevenDays.toFixed(0)} d`
                    : "No llega"
                }
                hint={`${formatPct(summary.batchBreakevenPct, 0)} de ${summary.batchCount} lotes cubren su coste con los cobros (mediana de días)`}
                tone={summary.batchBreakevenPct >= 50 ? "positive" : "negative"}
              />
              <KpiCard
 compact
                label="Cuentas hasta breakeven"
                value={summary.accountsToBreakeven !== null ? `${summary.accountsToBreakeven}` : "No llega"}
                hint="Cuentas compradas hasta que el neto acumulado queda en positivo"
              />
            </div>
          </div>
        )}

        {hasTarget && payoutAmount > 0 && (
          <div className="rounded-lg border border-border bg-surface p-4">
            <h2 className="mb-1 text-sm font-semibold">Beneficio acumulado comprando cuentas</h2>
            <p className="mb-3 text-xs text-muted">
              Tras cada cuenta comprada: costos (pruebas + activaciones), cobros recibidos y neto
              (cobros − costos). La línea punteada es el neto esperado: {formatCurrency(summary.avgNetPerAccount)} por cuenta.
              El breakeven es donde los cobros cruzan a los costos.
            </p>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={netData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="account" stroke="var(--color-muted)" fontSize={12} minTickGap={32} />
                <YAxis
                  stroke="var(--color-muted)"
                  fontSize={12}
                  tickFormatter={(v) => formatCurrency(v)}
                  width={80}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                  }}
                  labelFormatter={(v) => `Cuenta #${v}`}
                  formatter={(value) => formatCurrency(Number(value))}
                />
                <ReferenceLine y={0} stroke="var(--color-muted)" />
                <Line dataKey="costos" name="Costos acumulados" stroke={COLORS.failed} strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line dataKey="cobros" name="Cobros acumulados" stroke={COLORS.passed} strokeWidth={1.5} strokeOpacity={0.7} dot={false} isAnimationActive={false} />
                <Line dataKey="real" name="Beneficio neto" stroke="var(--color-accent)" strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line dataKey="esperado" name="Neto esperado" stroke="var(--color-foreground)" strokeWidth={2} strokeDasharray="6 4" dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">
              Curvas de equity de la prueba ({drawn.length} de {results.length} cuentas)
            </h2>
            <div className="flex gap-3 text-xs text-muted">
              <span style={{ color: COLORS.passed }}>● objetivo</span>
              <span style={{ color: COLORS.failed }}>● quiebra</span>
              <span style={{ color: COLORS.incomplete }}>● sin resolver</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="day" stroke="var(--color-muted)" fontSize={12} minTickGap={32} label={{ value: "Día", position: "insideBottomRight", offset: -4, fill: "var(--color-muted)", fontSize: 11 }} />
              <YAxis
                stroke="var(--color-muted)"
                fontSize={12}
                domain={["auto", "auto"]}
                tickFormatter={(v) => formatCurrency(v)}
                width={80}
              />
              <Tooltip
                content={() => null}
                cursor={{ stroke: "var(--color-muted)", strokeDasharray: "3 3" }}
              />
              <ReferenceLine y={startEquity} stroke="var(--color-muted)" strokeDasharray="4 4" />
              {hasTarget && (
                <ReferenceLine
                  y={startEquity + profitTarget}
                  stroke={COLORS.passed}
                  strokeDasharray="6 4"
                  label={{ value: "Objetivo", fill: COLORS.passed, fontSize: 11, position: "insideTopRight" }}
                />
              )}
              {drawdownType === "static" && (
                <ReferenceLine
                  y={startEquity - drawdownSize}
                  stroke={COLORS.failed}
                  strokeDasharray="6 4"
                  label={{ value: "Límite DD", fill: COLORS.failed, fontSize: 11, position: "insideBottomRight" }}
                />
              )}
              {drawn.map((r, k) => (
                <Line
                  key={k}
                  dataKey={`r${k}`}
                  stroke={COLORS[r.outcome]}
                  strokeOpacity={0.45}
                  strokeWidth={1.2}
                  dot={false}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
          {(drawdownType === "eod" || drawdownType === "intraday") && (
            <p className="mt-2 text-xs text-muted">
              El suelo trailing es distinto en cada cuenta, por eso no se dibuja una línea única.
              Una curva roja terminó al tocar su suelo.
            </p>
          )}
        </div>

        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full min-w-[420px] text-left text-sm">
            <thead className="border-b border-border text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-3">Equity final</th>
                <th className="px-4 py-3">Valor</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Mejor cuenta", summary.bestFinal],
                ["Percentil 95", summary.p95Final],
                ["Media", summary.meanFinal],
                ["Mediana", summary.medianFinal],
                ["Percentil 5", summary.p5Final],
                ["Peor cuenta", summary.worstFinal],
              ].map(([label, value]) => (
                <tr key={label as string} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5">{label}</td>
                  <td
                    className={`px-4 py-2.5 font-medium ${
                      (value as number) >= startEquity ? "text-positive" : "text-negative"
                    }`}
                  >
                    {formatCurrency(value as number)}
                  </td>
                </tr>
              ))}
              <tr>
                <td className="px-4 py-2.5">Drawdown máximo (mediana)</td>
                <td className="px-4 py-2.5 font-medium">{formatCurrency(summary.medianMaxDrawdown)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <ReportBacktest params={params} />
      </div>
    </div>
  );
}
