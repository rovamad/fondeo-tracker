import { SubmitButton } from "@/components/SubmitButton";
import { createTransaction, deleteAccount, promoteToLive, updateAccountStatus } from "@/lib/actions";
import type { MetricAccount } from "@/lib/metrics";

export function AccountRowActions({ account }: { account: MetricAccount }) {
  const markFunded = promoteToLive.bind(null, account.id);
  const markFailed = updateAccountStatus.bind(null, account.id, "FAILED");
  const markClosed = updateAccountStatus.bind(null, account.id, "CLOSED");
  const removeAccount = deleteAccount.bind(null, account.id);

  return (
    <div className="flex flex-wrap gap-1.5">
      {account.stage === "EVALUATION" && account.status === "ACTIVE" && (
        <details className="relative">
          <summary className="cursor-pointer list-none rounded-md bg-positive/15 px-2 py-1 text-xs font-medium text-positive hover:bg-positive/25">
            Pasó a live
          </summary>
          <form
            action={markFunded}
            className="absolute left-0 z-10 mt-1 flex w-56 flex-col gap-2 rounded-md border border-border bg-surface p-3 shadow-lg"
          >
            <label className="flex flex-col gap-1 text-xs text-muted">
              Nuevo nombre live (vacío = mantener)
              <input
                name="liveLabel"
                defaultValue=""
                className="rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted">
              Costo de activación (vacío = sin costo)
              <input
                name="activationCost"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                className="rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground"
              />
            </label>
            <SubmitButton className="rounded-md bg-positive/15 px-2 py-1 text-xs font-medium text-positive hover:bg-positive/25">
              Confirmar
            </SubmitButton>
          </form>
        </details>
      )}
      {account.stage === "FUNDED" && account.status === "ACTIVE" && (
        <details className="relative">
          <summary className="cursor-pointer list-none rounded-md bg-positive/15 px-2 py-1 text-xs font-medium text-positive hover:bg-positive/25">
            Registrar retiro
          </summary>
          <form
            action={createTransaction}
            className="absolute left-0 z-10 mt-1 flex w-56 flex-col gap-2 rounded-md border border-border bg-surface p-3 shadow-lg"
          >
            <input type="hidden" name="accountId" value={account.id} />
            <input type="hidden" name="type" value="PAYOUT" />
            <label className="flex flex-col gap-1 text-xs text-muted">
              Monto ($)
              <input
                name="amount"
                type="number"
                min="0"
                step="0.01"
                required
                className="rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted">
              Fecha (vacío = hoy)
              <input
                name="date"
                type="date"
                className="rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted">
              Nota (opcional)
              <input
                name="note"
                className="rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground"
              />
            </label>
            <SubmitButton className="rounded-md bg-positive/15 px-2 py-1 text-xs font-medium text-positive hover:bg-positive/25">
              Confirmar
            </SubmitButton>
          </form>
        </details>
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
