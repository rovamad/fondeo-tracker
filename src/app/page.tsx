import { loadAllAccounts, loadAllTransactions } from "@/lib/data";
import {
  computeDashboardMetrics,
  computeEquityCurve,
  computeFirmBreakdown,
  computeMonthlySeries,
} from "@/lib/metrics";
import { resolveRange } from "@/lib/dateRanges";
import { DashboardFilters } from "@/components/DashboardFilters";
import { KpiCard } from "@/components/KpiCard";
import { EquityChart } from "@/components/EquityChart";
import { MonthlyChart } from "@/components/MonthlyChart";
import { formatCurrency, formatPct } from "@/lib/format";

export default async function DashboardPage(props: PageProps<"/">) {
  const sp = await props.searchParams;
  const firmParam = typeof sp.firm === "string" ? sp.firm : undefined;
  const fromParam = typeof sp.from === "string" ? sp.from : undefined;
  const toParam = typeof sp.to === "string" ? sp.to : undefined;
  const presetParam = typeof sp.preset === "string" ? sp.preset : undefined;

  const [accounts, transactions] = await Promise.all([
    loadAllAccounts(),
    loadAllTransactions(),
  ]);

  const { range, preset } = resolveRange({
    preset: presetParam,
    from: fromParam,
    to: toParam,
  });
  const filter = { ...range, firm: firmParam };

  const metrics = computeDashboardMetrics(accounts, transactions, filter);
  const equity = computeEquityCurve(accounts, transactions, filter);
  const monthly = computeMonthlySeries(accounts, transactions, filter);
  const firms = Array.from(new Set(accounts.map((a) => a.firm))).sort();
  const firmBreakdown = computeFirmBreakdown(accounts, transactions, range)
    .filter((f) => !firmParam || f.firm === firmParam)
    .filter((f) => f.accountsCount > 0 || f.totalExpense > 0 || f.totalPayout > 0)
    .sort((a, b) => b.netProfit - a.netProfit);
  const topByRoi = [...firmBreakdown].sort((a, b) => b.roiPct - a.roiPct).slice(0, 3);
  const topByPayout = [...firmBreakdown]
    .sort((a, b) => b.totalPayout - a.totalPayout)
    .slice(0, 3);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted">
          Vista general de tus cuentas de fondeo
        </p>
      </div>

      <DashboardFilters
        basePath="/"
        activePreset={preset}
        firms={firms}
        currentFirm={firmParam}
        currentFrom={fromParam}
        currentTo={toParam}
      />

      {/* Fila 1 y 2: KPIs principales */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <KpiCard
          label="Evaluaciones"
          value={String(metrics.evaluationsCount)}
          hint={`${metrics.activeAccountsNow} activas ahora`}
        />
        <KpiCard
          label="Cuentas live"
          value={String(metrics.liveAccountsCount)}
          hint={`${metrics.liveWithPayoutCount} con retiros`}
        />
        <KpiCard
          label="Funding ratio"
          value={formatPct(metrics.fundingRatioPct)}
          hint={`${metrics.fundedCount} de ${metrics.evaluationsFinished} evaluaciones finalizadas`}
        />
        <KpiCard
          label="Gastos totales"
          value={formatCurrency(metrics.totalExpense)}
          hint={`Promedio: ${formatCurrency(metrics.avgExpensePerAccount)} / cuenta`}
        />
        <KpiCard
          label="Ganancias totales"
          value={formatCurrency(metrics.totalPayout)}
          hint={`Promedio: ${formatCurrency(metrics.avgPayoutPerPayout)} / retiro`}
        />
        <KpiCard
          label="Beneficio neto"
          value={formatCurrency(metrics.netProfit)}
          hint={`ROI: ${formatPct(metrics.roiPct)}`}
          tone={metrics.netProfit >= 0 ? "positive" : "negative"}
        />
      </div>

      {/* Evolución del capital */}
      <div className="rounded-lg border border-border bg-surface p-4">
        <h2 className="text-sm font-medium">Evolución del capital</h2>
        <p className="mb-2 text-xs text-muted">Seguimiento de tu rendimiento en el tiempo</p>
        <EquityChart data={equity} />
      </div>

      {/* Mejor / peor día, promedio, retiros */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Mejor día"
          value={formatCurrency(metrics.bestDay)}
          hint="Mayor ganancia diaria"
          tone="positive"
        />
        <KpiCard
          label="Peor día"
          value={formatCurrency(metrics.worstDay)}
          hint="Mayor pérdida diaria"
          tone={metrics.worstDay < 0 ? "negative" : "neutral"}
        />
        <KpiCard
          label="Promedio diario"
          value={formatCurrency(metrics.avgDailyNet)}
          hint="Cambio promedio por día"
        />
        <KpiCard
          label="Retiros"
          value={String(metrics.payoutCount)}
          hint="Número de retiros realizados"
        />
      </div>

      {/* Análisis por empresa */}
      <div>
        <h2 className="text-base font-semibold">Análisis por empresa</h2>
        <p className="text-sm text-muted">Rendimiento detallado de cada prop firm</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-surface p-4">
          <h3 className="mb-3 text-sm font-medium">Top empresas por ROI</h3>
          <div className="flex flex-col gap-2">
            {topByRoi.map((f, i) => (
              <div
                key={f.firm}
                className="flex items-center justify-between rounded-md bg-background px-3 py-2"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full border border-border text-xs">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{f.firm}</p>
                    <p className="text-xs text-muted">{f.accountsCount} cuentas</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold ${f.roiPct >= 0 ? "text-positive" : "text-negative"}`}>
                    {formatPct(f.roiPct)}
                  </p>
                  <p className="text-xs text-muted">{formatCurrency(f.netProfit)}</p>
                </div>
              </div>
            ))}
            {topByRoi.length === 0 && <p className="text-sm text-muted">Sin datos</p>}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface p-4">
          <h3 className="mb-3 text-sm font-medium">Top empresas por retiros</h3>
          <div className="flex flex-col gap-2">
            {topByPayout.map((f, i) => (
              <div
                key={f.firm}
                className="flex items-center justify-between rounded-md bg-background px-3 py-2"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full border border-border text-xs">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{f.firm}</p>
                    <p className="text-xs text-muted">{f.payoutCount} retiros</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{formatCurrency(f.totalPayout)}</p>
                  <p className="text-xs text-muted">Promedio: {formatCurrency(f.avgPayout)}</p>
                </div>
              </div>
            ))}
            {topByPayout.length === 0 && <p className="text-sm text-muted">Sin datos</p>}
          </div>
        </div>
      </div>

      {/* Todas las empresas */}
      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <h3 className="px-4 pt-4 text-sm font-medium">Todas las empresas</h3>
        <table className="mt-2 w-full min-w-160 text-left text-sm">
          <thead className="border-b border-border text-xs uppercase text-muted">
            <tr>
              <th className="px-4 py-3">Empresa</th>
              <th className="px-4 py-3">Cuentas</th>
              <th className="px-4 py-3">Gastos</th>
              <th className="px-4 py-3">Retiros</th>
              <th className="px-4 py-3">Beneficio</th>
              <th className="px-4 py-3">ROI</th>
            </tr>
          </thead>
          <tbody>
            {firmBreakdown.map((f) => (
              <tr key={f.firm} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium">{f.firm}</td>
                <td className="px-4 py-3">{f.accountsCount}</td>
                <td className="px-4 py-3 text-negative">{formatCurrency(f.totalExpense)}</td>
                <td className="px-4 py-3 text-positive">{formatCurrency(f.totalPayout)}</td>
                <td className={`px-4 py-3 font-medium ${f.netProfit >= 0 ? "text-positive" : "text-negative"}`}>
                  {formatCurrency(f.netProfit)}
                </td>
                <td className="px-4 py-3">{formatPct(f.roiPct)}</td>
              </tr>
            ))}
            {firmBreakdown.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted">
                  Sin datos en este rango
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Métricas adicionales */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Live que retiran"
          value={formatPct(metrics.pctLiveWithPayout)}
          hint={`${metrics.liveWithPayoutCount} de ${metrics.liveAccountsCount} cuentas live`}
        />
        <KpiCard
          label="Tasa de éxito"
          value={formatPct(metrics.successRatePct)}
          hint={`${metrics.approvedCount} aprobadas / ${metrics.failedCount} quemadas`}
        />
        <KpiCard label="Costo por cuenta fondeada" value={formatCurrency(metrics.costPerFundedAccount)} />
        <KpiCard label="Retiro más alto" value={formatCurrency(metrics.highestPayout)} />
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <h2 className="mb-2 text-sm font-medium text-muted">Gasto vs retiro por mes</h2>
        <MonthlyChart data={monthly} />
      </div>
    </div>
  );
}
