import Link from "next/link";
import { loadAllAccounts, loadAllTransactions } from "@/lib/data";
import { AccountForm } from "@/components/AccountForm";
import { AccountRowActions } from "@/components/AccountRowActions";
import { StageBadge, StatusBadge } from "@/components/Badges";
import { formatCurrency, formatDate } from "@/lib/format";

export default async function AccountsPage() {
  const [accounts, transactions] = await Promise.all([
    loadAllAccounts(),
    loadAllTransactions(),
  ]);

  const totalsByAccount = new Map<string, { expense: number; payout: number }>();
  for (const t of transactions) {
    const entry = totalsByAccount.get(t.accountId) ?? { expense: 0, payout: 0 };
    if (t.type === "EXPENSE") entry.expense += t.amount;
    else entry.payout += t.amount;
    totalsByAccount.set(t.accountId, entry);
  }

  const sorted = [...accounts].sort(
    (a, b) => b.purchasedAt.getTime() - a.purchasedAt.getTime()
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Cuentas</h1>
        <p className="text-sm text-muted">Todas tus cuentas de fondeo</p>
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <h2 className="mb-3 text-sm font-medium text-muted">Nueva cuenta</h2>
        <AccountForm />
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="border-b border-border text-xs uppercase text-muted">
            <tr>
              <th className="px-4 py-3">Firma</th>
              <th className="px-4 py-3">Tamaño</th>
              <th className="px-4 py-3">Etapa</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Comprada</th>
              <th className="px-4 py-3">Gasto</th>
              <th className="px-4 py-3">Retiros</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((account) => {
              const totals = totalsByAccount.get(account.id) ?? { expense: 0, payout: 0 };
              return (
                <tr key={account.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <Link href={`/cuentas/${account.id}`} className="font-medium hover:text-accent">
                      {account.firm}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{formatCurrency(account.size)}</td>
                  <td className="px-4 py-3">
                    <StageBadge stage={account.stage} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={account.status} />
                  </td>
                  <td className="px-4 py-3 text-muted">{formatDate(account.purchasedAt)}</td>
                  <td className="px-4 py-3 text-negative">{formatCurrency(totals.expense)}</td>
                  <td className="px-4 py-3 text-positive">{formatCurrency(totals.payout)}</td>
                  <td className="px-4 py-3">
                    <AccountRowActions account={account} />
                  </td>
                </tr>
              );
            })}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-muted">
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
