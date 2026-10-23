import { notFound } from "next/navigation";
import Link from "next/link";
import { loadAccountById } from "@/lib/data";
import { StageBadge, StatusBadge } from "@/components/Badges";
import { AccountRowActions } from "@/components/AccountRowActions";
import { TransactionForm } from "@/components/TransactionForm";
import { TransactionDeleteButton } from "@/components/TransactionDeleteButton";
import { TransactionsTable } from "@/components/TransactionsTable";
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
        {account.label && (
          <p className="text-sm text-muted">
            {account.label}
            {account.evaluationLabel && ` · antes: ${account.evaluationLabel}`}
          </p>
        )}
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

      <TransactionsTable
        rows={account.transactions.map((tx) => ({
          id: tx.id,
          accountName: account.label || account.firm,
          accountDetail: "",
          type: tx.type,
          category: tx.category,
          amount: tx.amount,
          date: tx.date,
          note: tx.note,
          actions: <TransactionDeleteButton id={tx.id} accountId={tx.accountId} />,
        }))}
        emptyMessage="Sin movimientos todavía"
      />
    </div>
  );
}
