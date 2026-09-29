import { deleteTransaction } from "@/lib/actions";
import { formatCurrency, formatDate } from "@/lib/format";

const categoryLabels: Record<string, string> = {
  EVALUATION: "Evaluación",
  RESET: "Reset",
  ACTIVATION: "Activación",
  SUBSCRIPTION: "Mensualidad",
  OTHER: "Otro",
};

interface Row {
  id: string;
  accountId: string;
  type: "EXPENSE" | "PAYOUT";
  category: string | null;
  amount: number;
  date: Date;
  note: string | null;
}

export function TransactionRow({ tx, showAccount }: { tx: Row & { accountFirm?: string }; showAccount?: boolean }) {
  const remove = deleteTransaction.bind(null, tx.id, tx.accountId);

  return (
    <tr className="border-b border-border last:border-0">
      {showAccount && <td className="px-4 py-3 text-muted">{tx.accountFirm}</td>}
      <td className="px-4 py-3 text-muted">{formatDate(tx.date)}</td>
      <td className="px-4 py-3">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            tx.type === "PAYOUT" ? "bg-positive/15 text-positive" : "bg-negative/15 text-negative"
          }`}
        >
          {tx.type === "PAYOUT" ? "Retiro" : "Gasto"}
        </span>
      </td>
      <td className="px-4 py-3 text-muted">
        {tx.type === "EXPENSE" ? categoryLabels[tx.category ?? "OTHER"] : "—"}
      </td>
      <td className={`px-4 py-3 font-medium ${tx.type === "PAYOUT" ? "text-positive" : "text-negative"}`}>
        {formatCurrency(tx.amount)}
      </td>
      <td className="px-4 py-3 text-muted">{tx.note ?? "—"}</td>
      <td className="px-4 py-3">
        <form action={remove}>
          <button className="rounded-md bg-surface-hover px-2 py-1 text-xs font-medium text-muted hover:text-negative">
            Eliminar
          </button>
        </form>
      </td>
    </tr>
  );
}
