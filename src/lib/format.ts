const currencyFormatter = new Intl.NumberFormat("es-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("es-ES", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

export function formatPct(value: number, digits = 1): string {
  return `${value.toFixed(digits)}%`;
}

export function formatDate(value: Date): string {
  return dateFormatter.format(value);
}

export function toInputDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

// Las fechas se guardan como día calendario a medianoche UTC; así el día que el
// usuario elige es el que se muestra sin importar su zona horaria.
export function todayDate(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

export function parseDateInput(raw: string | undefined): Date {
  if (!raw) return todayDate();
  const date = new Date(`${raw}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) throw new Error(`Fecha inválida: "${raw}"`);
  return date;
}

export function accountName(account: { firm: string; label: string | null }): string {
  return account.label || account.firm;
}

// Nombre + firma + tamaño, para identificar la cuenta en un selector.
export function accountOptionLabel(account: {
  firm: string;
  label?: string | null;
  size: number;
}): string {
  const parts = account.label ? [account.label, account.firm] : [account.firm];
  return `${parts.join(" · ")} · ${formatCurrency(account.size)}`;
}
