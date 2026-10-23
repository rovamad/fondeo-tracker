import { prisma } from "@/lib/db";
import { loadAllAccounts } from "@/lib/data";
import { TransactionForm } from "@/components/TransactionForm";
import { TransactionDeleteButton } from "@/components/TransactionDeleteButton";
import { TransactionsTable } from "@/components/TransactionsTable";
import { accountName, accountOptionLabel, formatCurrency } from "@/lib/format";
import Link from "next/link";

export default async function MovimientosPage(props: PageProps<"/movimientos">) {
  const sp = await props.searchParams;
  const accountId = typeof sp.accountId === "string" ? sp.accountId : undefined;
  const type = typeof sp.type === "string" ? sp.type : undefined;

  const [accounts, transactions] = await Promise.all([
    loadAllAccounts(),
    prisma.transaction.findMany({
      where: {
        accountId: accountId || undefined,
        type: type === "EXPENSE" || type === "PAYOUT" ? type : undefined,
      },
      include: { account: true },
      orderBy: { date: "desc" },
    }),
  ]);

  const accountOptions = accounts
    .slice()
    .sort((a, b) => a.firm.localeCompare(b.firm))
    .map((a) => ({
      id: a.id,
      label: accountOptionLabel(a),
      canPayout: a.stage === "FUNDED" && a.status === "ACTIVE",
    }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Movimientos</h1>
        <p className="text-sm text-muted">Gastos y retiros de todas tus cuentas</p>
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <h2 className="mb-3 text-sm font-medium text-muted">Registrar movimiento</h2>
        <TransactionForm accounts={accountOptions} />
      </div>

      <form method="get" action="/movimientos" className="flex flex-wrap gap-2">
        <select
          name="accountId"
          defaultValue={accountId ?? ""}
          className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
        >
          <option value="">Todas las cuentas</option>
          {accountOptions.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </select>
        <select
          name="type"
          defaultValue={type ?? ""}
          className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
        >
          <option value="">Todos los tipos</option>
          <option value="EXPENSE">Gastos</option>
          <option value="PAYOUT">Retiros</option>
        </select>
        <button
          type="submit"
          className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
        >
          Filtrar
        </button>
      </form>

      <TransactionsTable
        showAccount
        rows={transactions.map((tx) => ({
          id: tx.id,
          accountName: accountName(tx.account),
          accountDetail: `${tx.account.label ? `${tx.account.firm} · ` : ""}${formatCurrency(tx.account.size)}`,
          type: tx.type,
          category: tx.category,
          amount: tx.amount,
          date: tx.date,
          note: tx.note,
          actions: <TransactionDeleteButton id={tx.id} accountId={tx.accountId} />,
        }))}
        emptyMessage={
          <>
            Sin movimientos.{" "}
            <Link href="/cuentas" className="text-accent hover:underline">
              Crea una cuenta primero
            </Link>
            .
          </>
        }
      />
    </div>
  );
}
