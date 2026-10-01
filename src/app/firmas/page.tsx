import { loadAllAccounts, loadAllTransactions } from "@/lib/data";
import { computeFirmBreakdown } from "@/lib/metrics";
import { formatCurrency, formatPct } from "@/lib/format";

export default async function FirmasPage() {
  const [accounts, transactions] = await Promise.all([
    loadAllAccounts(),
    loadAllTransactions(),
  ]);

  const breakdown = computeFirmBreakdown(accounts, transactions).sort(
    (a, b) => b.netProfit - a.netProfit
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Rendimiento por firma</h1>
        <p className="text-sm text-muted">Compara qué firmas te dan mejor retorno</p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="border-b border-border text-xs uppercase text-muted">
            <tr>
              <th className="px-4 py-3">Firma</th>
              <th className="px-4 py-3">Cuentas</th>
              <th className="px-4 py-3">Fondeadas</th>
              <th className="px-4 py-3">Funding ratio</th>
              <th className="px-4 py-3">Gasto</th>
              <th className="px-4 py-3">Retiros</th>
              <th className="px-4 py-3">Neta</th>
              <th className="px-4 py-3">ROI</th>
              <th className="px-4 py-3">Live que retiran</th>
            </tr>
          </thead>
          <tbody>
            {breakdown.map((f) => (
              <tr key={f.firm} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium">{f.firm}</td>
                <td className="px-4 py-3">{f.accountsCount}</td>
                <td className="px-4 py-3">{f.fundedCount}</td>
                <td className="px-4 py-3">{formatPct(f.fundingRatioPct)}</td>
                <td className="px-4 py-3 text-negative">{formatCurrency(f.totalExpense)}</td>
                <td className="px-4 py-3 text-positive">{formatCurrency(f.totalPayout)}</td>
                <td className={`px-4 py-3 font-medium ${f.netProfit >= 0 ? "text-positive" : "text-negative"}`}>
                  {formatCurrency(f.netProfit)}
                </td>
                <td className={`px-4 py-3 ${f.roiPct >= 0 ? "text-positive" : "text-negative"}`}>
                  {formatPct(f.roiPct)}
                </td>
                <td className="px-4 py-3">{formatPct(f.pctLiveWithPayout)}</td>
              </tr>
            ))}
            {breakdown.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-6 text-center text-muted">
                  Aún no tienes cuentas registradas
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
