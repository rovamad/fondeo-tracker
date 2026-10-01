import { loadAllAccounts, loadAllTransactions } from "@/lib/data";
import { computeDashboardMetrics } from "@/lib/metrics";
import { Simulator } from "@/components/Simulator";

export default async function SimuladorPage() {
  const [accounts, transactions] = await Promise.all([
    loadAllAccounts(),
    loadAllTransactions(),
  ]);
  const m = computeDashboardMetrics(accounts, transactions);
  const trackerRatio = m.totalExpense > 0 ? m.totalPayout / m.totalExpense : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Simulador de equity</h1>
        <p className="text-sm text-muted">
          Monte Carlo con tus estadísticas, drawdown trailing/EOD y objetivo de profit
        </p>
      </div>
      <Simulator trackerRatio={trackerRatio} />
    </div>
  );
}
