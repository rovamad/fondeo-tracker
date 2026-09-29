import { createAccount } from "@/lib/actions";

export function AccountForm() {
  return (
    <form action={createAccount} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <label className="flex flex-col gap-1 text-sm">
        Firma
        <input
          name="firm"
          required
          placeholder="Topstep"
          className="rounded-md border border-border bg-background px-2 py-1.5"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Tamaño ($)
        <input
          name="size"
          type="number"
          step="1"
          required
          placeholder="50000"
          className="rounded-md border border-border bg-background px-2 py-1.5"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Costo pagado ($)
        <input
          name="cost"
          type="number"
          step="0.01"
          required
          placeholder="150"
          className="rounded-md border border-border bg-background px-2 py-1.5"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Fecha de compra
        <input
          name="purchasedAt"
          type="date"
          className="rounded-md border border-border bg-background px-2 py-1.5"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm sm:col-span-2 lg:col-span-3">
        Etiqueta (opcional)
        <input
          name="label"
          placeholder="Ej. Cuenta 2 - reset de enero"
          className="rounded-md border border-border bg-background px-2 py-1.5"
        />
      </label>
      <div className="flex items-end">
        <button
          type="submit"
          className="w-full rounded-md bg-accent px-3 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Crear cuenta
        </button>
      </div>
    </form>
  );
}
