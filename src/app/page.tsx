import { loadAllAccounts, loadAllTransactions } from "@/lib/data";
import {
  computeDashboardMetrics,
  computeEquityCurve,
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

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        <KpiCard
          label="Ganancia neta"
          value={formatCurrency(metrics.netProfit)}
          tone={metrics.netProfit >= 0 ? "positive" : "negative"}
        />
        <KpiCard
          label="ROI"
          value={formatPct(metrics.roiPct)}
          tone={metrics.roiPct >= 0 ? "positive" : "negative"}
        />
        <KpiCard label="Gasto total" value={formatCurrency(metrics.totalExpense)} />
        <KpiCard label="Retiros totales" value={formatCurrency(metrics.totalPayout)} />

        <KpiCard
          label="Funding ratio"
          value={formatPct(metrics.fundingRatioPct)}
          hint={`${metrics.fundedCount} de ${metrics.evaluationsFinished} evaluaciones finalizadas`}
        />
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
        <KpiCard label="Evaluaciones compradas" value={String(metrics.evaluationsCount)} />

        <KpiCard label="Gasto promedio / cuenta" value={formatCurrency(metrics.avgExpensePerAccount)} />
        <KpiCard label="Retiro promedio" value={formatCurrency(metrics.avgPayoutPerPayout)} />
        <KpiCard label="Costo por cuenta fondeada" value={formatCurrency(metrics.costPerFundedAccount)} />
        <KpiCard label="Cuentas activas ahora" value={String(metrics.activeAccountsNow)} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-surface p-4">
          <h2 className="mb-2 text-sm font-medium text-muted">Curva de equity</h2>
          <EquityChart data={equity} />
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <h2 className="mb-2 text-sm font-medium text-muted">Gasto vs retiro por mes</h2>
          <MonthlyChart data={monthly} />
        </div>
      </div>
    </div>
  );
}
