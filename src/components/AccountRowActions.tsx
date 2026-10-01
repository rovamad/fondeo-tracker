import { deleteAccount, updateAccountStage, updateAccountStatus } from "@/lib/actions";
import type { MetricAccount } from "@/lib/metrics";

export function AccountRowActions({ account }: { account: MetricAccount }) {
  const markFunded = updateAccountStage.bind(null, account.id, "FUNDED");
  const markFailed = updateAccountStatus.bind(null, account.id, "FAILED");
  const markClosed = updateAccountStatus.bind(null, account.id, "CLOSED");
  const removeAccount = deleteAccount.bind(null, account.id);

  return (
    <div className="flex flex-wrap gap-1.5">
      {account.stage === "EVALUATION" && (
        <form action={markFunded}>
          <button className="rounded-md bg-positive/15 px-2 py-1 text-xs font-medium text-positive hover:bg-positive/25">
            Pasó a live
          </button>
        </form>
      )}
      {account.status === "ACTIVE" && (
        <form action={markFailed}>
          <button className="rounded-md bg-negative/15 px-2 py-1 text-xs font-medium text-negative hover:bg-negative/25">
            Quemada
          </button>
        </form>
      )}
      {account.status === "ACTIVE" && (
        <form action={markClosed}>
          <button className="rounded-md bg-surface-hover px-2 py-1 text-xs font-medium text-muted hover:text-foreground">
            Cerrar
          </button>
        </form>
      )}
      <form action={removeAccount}>
        <button className="rounded-md bg-surface-hover px-2 py-1 text-xs font-medium text-muted hover:text-negative">
          Eliminar
        </button>
      </form>
    </div>
  );
}
