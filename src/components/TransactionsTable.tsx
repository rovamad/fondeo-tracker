"use client";

import { useMemo, useState } from "react";
import { formatCurrency, formatDate } from "@/lib/format";

export interface TransactionTableRow {
  id: string;
  accountName: string;
  accountDetail: string;
  type: "EXPENSE" | "PAYOUT";
  category: string | null;
  amount: number;
  date: Date;
  note: string | null;
  actions: React.ReactNode;
}

type SortKey = "account" | "date" | "type" | "category" | "amount" | "note";
type SortDir = "asc" | "desc";

const categoryLabels: Record<string, string> = {
  EVALUATION: "Evaluación",
  RESET: "Reset",
  ACTIVATION: "Activación",
  SUBSCRIPTION: "Mensualidad",
  OTHER: "Otro",
};

const COLUMNS: { key: SortKey; label: string; account?: boolean }[] = [
  { key: "account", label: "Cuenta", account: true },
  { key: "date", label: "Fecha" },
  { key: "type", label: "Tipo" },
  { key: "category", label: "Categoría" },
  { key: "amount", label: "Monto" },
  { key: "note", label: "Nota" },
];

function categoryLabel(row: TransactionTableRow): string {
  return row.type === "EXPENSE" ? categoryLabels[row.category ?? "OTHER"] : "—";
}

function sortValue(row: TransactionTableRow, key: SortKey): string | number {
  switch (key) {
    case "account":
      return `${row.accountName} ${row.accountDetail}`.toLowerCase();
    case "date":
      return row.date.getTime();
    case "type":
      return row.type;
    case "category":
      return categoryLabel(row);
    case "amount":
      return row.amount;
    case "note":
      return (row.note ?? "").toLowerCase();
  }
}

export function TransactionsTable({
  rows,
  showAccount = false,
  emptyMessage,
}: {
  rows: TransactionTableRow[];
  showAccount?: boolean;
  emptyMessage: React.ReactNode;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const columns = COLUMNS.filter((c) => showAccount || !c.account);

  const sorted = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    return rows.slice().sort((a, b) => {
      const av = sortValue(a, sortKey);
      const bv = sortValue(b, sortKey);
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }, [rows, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "date" || key === "amount" ? "desc" : "asc");
    }
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-border text-xs uppercase text-muted">
          <tr>
            {columns.map((col) => {
              const active = col.key === sortKey;
              return (
                <th
                  key={col.key}
                  className="px-4 py-3"
                  aria-sort={active ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                >
                  <button
                    type="button"
                    onClick={() => toggleSort(col.key)}
                    className={`inline-flex items-center gap-1 uppercase hover:text-foreground ${
                      active ? "text-foreground" : ""
                    }`}
                  >
                    {col.label}
                    <span aria-hidden className="w-3 text-[10px]">
                      {active ? (sortDir === "asc" ? "▲" : "▼") : ""}
                    </span>
                  </button>
                </th>
              );
            })}
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((tx) => (
            <tr key={tx.id} className="border-b border-border last:border-0">
              {showAccount && (
                <td className="px-4 py-3">
                  <div className="font-medium">{tx.accountName}</div>
                  <div className="text-xs text-muted">{tx.accountDetail}</div>
                </td>
              )}
              <td className="px-4 py-3 text-muted">{formatDate(tx.date)}</td>
              <td className="px-4 py-3">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    tx.type === "PAYOUT"
                      ? "bg-positive/15 text-positive"
                      : "bg-negative/15 text-negative"
                  }`}
                >
                  {tx.type === "PAYOUT" ? "Retiro" : "Gasto"}
                </span>
              </td>
              <td className="px-4 py-3 text-muted">{categoryLabel(tx)}</td>
              <td
                className={`px-4 py-3 font-medium ${
                  tx.type === "PAYOUT" ? "text-positive" : "text-negative"
                }`}
              >
                {formatCurrency(tx.amount)}
              </td>
              <td className="px-4 py-3 text-muted">{tx.note ?? "—"}</td>
              <td className="px-4 py-3">{tx.actions}</td>
            </tr>
          ))}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={columns.length + 1} className="px-4 py-6 text-center text-muted">
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
