"use client";

import { useState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { createTransaction } from "@/lib/actions";

export interface TransactionAccountOption {
  id: string;
  label: string;
  /** Fondeada y activa: la única que puede registrar retiros */
  canPayout: boolean;
}

export function TransactionForm({
  accountId,
  accounts,
  defaultType = "EXPENSE",
}: {
  accountId?: string;
  accounts?: TransactionAccountOption[];
  defaultType?: "EXPENSE" | "PAYOUT";
}) {
  const [type, setType] = useState(defaultType);
  const options = type === "PAYOUT" ? accounts?.filter((a) => a.canPayout) : accounts;

  return (
    <form action={createTransaction} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <label className="flex flex-col gap-1 text-sm">
        Tipo
        <select
          name="type"
          value={type}
          onChange={(e) => setType(e.target.value as "EXPENSE" | "PAYOUT")}
          className="rounded-md border border-border bg-background px-2 py-1.5"
        >
          <option value="EXPENSE">Gasto</option>
          <option value="PAYOUT">Retiro</option>
        </select>
      </label>
      {accountId ? (
        <input type="hidden" name="accountId" value={accountId} />
      ) : (
        <label className="flex flex-col gap-1 text-sm">
          Cuenta
          <select
            key={type}
            name="accountId"
            required
            className="rounded-md border border-border bg-background px-2 py-1.5"
          >
            {options?.length === 0 && (
              <option value="" disabled>
                {type === "PAYOUT" ? "Sin cuentas fondeadas activas" : "Sin cuentas"}
              </option>
            )}
            {options?.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="flex flex-col gap-1 text-sm">
        Categoría (si es gasto)
        <select
          name="category"
          className="rounded-md border border-border bg-background px-2 py-1.5"
        >
          <option value="RESET">Reset</option>
          <option value="ACTIVATION">Activación</option>
          <option value="SUBSCRIPTION">Mensualidad</option>
          <option value="EVALUATION">Evaluación</option>
          <option value="OTHER">Otro</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Monto ($)
        <input
          name="amount"
          type="number"
          step="0.01"
          required
          className="rounded-md border border-border bg-background px-2 py-1.5"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Fecha
        <input
          name="date"
          type="date"
          className="rounded-md border border-border bg-background px-2 py-1.5"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm sm:col-span-2 lg:col-span-4">
        Nota (opcional)
        <input
          name="note"
          className="rounded-md border border-border bg-background px-2 py-1.5"
        />
      </label>
      <div className="flex items-end">
        <SubmitButton
          className="w-full rounded-md bg-accent px-3 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Registrar
        </SubmitButton>
      </div>
    </form>
  );
}
