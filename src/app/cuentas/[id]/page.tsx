import { notFound } from "next/navigation";
import Link from "next/link";
import { loadAccountById } from "@/lib/data";
import { StageBadge, StatusBadge } from "@/components/Badges";
import { AccountRowActions } from "@/components/AccountRowActions";
import { TransactionForm } from "@/components/TransactionForm";
import { TransactionRow } from "@/components/TransactionRow";
import { formatCurrency, formatDate } from "@/lib/format";

export default async function AccountDetailPage(props: PageProps<"/cuentas/[id]">) {
  const { id } = await props.params;
  const account = await loadAccountById(id);
  if (!account) notFound();

  const totalExpense = account.transactions
    .filter((t) => t.type === "EXPENSE")
    .reduce((acc, t) => acc + t.amount, 0);
  const totalPayout = account.transactions
    .filter((t) => t.type === "PAYOUT")
    .reduce((acc, t) => acc + t.amount, 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/cuentas" className="text-sm text-muted hover:text-foreground">
          ← Volver a cuentas
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold">
            {account.firm} · {formatCurrency(account.size)}
          </h1>
          <StageBadge stage={account.stage} />
          <StatusBadge status={account.status} />
        </div>
        {account.label && <p className="text-sm text-muted">{account.label}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-xs uppercase text-muted">Comprada</p>
          <p className="mt-1 font-medium">{formatDate(account.purchasedAt)}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-xs uppercase text-muted">Gasto acumulado</p>
          <p className="mt-1 font-medium text-negative">{formatCurrency(totalExpense)}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-xs uppercase text-muted">Retiros acumulados</p>
          <p className="mt-1 font-medium text-positive">{formatCurrency(totalPayout)}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-xs uppercase text-muted">Neta</p>
          <p className="mt-1 font-medium">{formatCurrency(totalPayout - totalExpense)}</p>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <AccountRowActions account={account} />
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <h2 className="mb-3 text-sm font-medium text-muted">Registrar movimiento</h2>
        <TransactionForm accountId={account.id} />
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-border text-xs uppercase text-muted">
            <tr>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Categoría</th>
              <th className="px-4 py-3">Monto</th>
              <th className="px-4 py-3">Nota</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {account.transactions.map((tx) => (
              <TransactionRow key={tx.id} tx={tx} />
            ))}
            {account.transactions.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted">
                  Sin movimientos todavía
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
