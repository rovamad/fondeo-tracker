import { loadAllAccounts, loadAllTransactions } from "@/lib/data";
import { AccountForm } from "@/components/AccountForm";
import { AccountRowActions } from "@/components/AccountRowActions";
import { AccountsTable, type AccountRow } from "@/components/AccountsTable";

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

  const rows: AccountRow[] = accounts.map((account) => {
    const totals = totalsByAccount.get(account.id) ?? { expense: 0, payout: 0 };
    return {
      id: account.id,
      firm: account.firm,
      label: account.label ?? null,
      evaluationLabel: account.evaluationLabel ?? null,
      size: account.size,
      stage: account.stage,
      status: account.status,
      purchasedAt: account.purchasedAt,
      expense: totals.expense,
      payout: totals.payout,
      actions: <AccountRowActions account={account} />,
    };
  });

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

      <AccountsTable rows={rows} />
    </div>
  );
}
