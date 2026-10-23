import { deleteTransaction } from "@/lib/actions";

export function TransactionDeleteButton({ id, accountId }: { id: string; accountId: string }) {
  const remove = deleteTransaction.bind(null, id, accountId);

  return (
    <form action={remove}>
      <button className="rounded-md bg-surface-hover px-2 py-1 text-xs font-medium text-muted hover:text-negative">
        Eliminar
      </button>
    </form>
  );
}
