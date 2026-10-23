"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { StageBadge, StatusBadge } from "@/components/Badges";
import { formatCurrency, formatDate } from "@/lib/format";
import type { AccountStage, AccountStatus } from "@/lib/metrics";

export interface AccountRow {
  id: string;
  firm: string;
  label: string | null;
  evaluationLabel: string | null;
  size: number;
  stage: AccountStage;
  status: AccountStatus;
  purchasedAt: Date;
  expense: number;
  payout: number;
  actions: React.ReactNode;
}

type SortKey = "name" | "size" | "stage" | "status" | "purchasedAt" | "expense" | "payout";
type SortDir = "asc" | "desc";

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "name", label: "Cuenta" },
  { key: "size", label: "Tamaño" },
  { key: "stage", label: "Etapa" },
  { key: "status", label: "Estado" },
  { key: "purchasedAt", label: "Comprada" },
  { key: "expense", label: "Gasto" },
  { key: "payout", label: "Retiros" },
];

function displayName(row: AccountRow): string {
  return row.label || row.firm;
}

function sortValue(row: AccountRow, key: SortKey): string | number {
  switch (key) {
    case "name":
      return displayName(row).toLowerCase();
    case "purchasedAt":
      return row.purchasedAt.getTime();
    default:
      return row[key];
  }
}

function matches(row: AccountRow, query: string): boolean {
  const haystack = [row.firm, row.label, row.evaluationLabel, String(row.size)]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => haystack.includes(term));
}

export function AccountsTable({ rows }: { rows: AccountRow[] }) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("purchasedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const visible = useMemo(() => {
    const filtered = rows.filter((row) => matches(row, query));
    const dir = sortDir === "asc" ? 1 : -1;
    return filtered.sort((a, b) => {
      const av = sortValue(a, sortKey);
      const bv = sortValue(b, sortKey);
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }, [rows, query, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "name" || key === "stage" || key === "status" ? "asc" : "desc");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filtrar por nombre, firma o tamaño…"
          className="w-full max-w-sm rounded-md border border-border bg-background px-3 py-1.5 text-sm"
        />
        <span className="text-xs text-muted">
          {visible.length} de {rows.length}
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="border-b border-border text-xs uppercase text-muted">
            <tr>
              {COLUMNS.map((col) => {
                const active = col.key === sortKey;
                return (
                  <th
                    key={col.key}
                    className="px-4 py-3"
                    aria-sort={
                      active ? (sortDir === "asc" ? "ascending" : "descending") : "none"
                    }
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
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={row.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3">
                  <Link href={`/cuentas/${row.id}`} className="font-medium hover:text-accent">
                    {displayName(row)}
                  </Link>
                  {row.label && (
                    <div className="text-xs text-muted">
                      {row.firm}
                      {row.evaluationLabel && ` · antes: ${row.evaluationLabel}`}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">{formatCurrency(row.size)}</td>
                <td className="px-4 py-3">
                  <StageBadge stage={row.stage} />
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={row.status} />
                </td>
                <td className="px-4 py-3 text-muted">{formatDate(row.purchasedAt)}</td>
                <td className="px-4 py-3 text-negative">{formatCurrency(row.expense)}</td>
                <td className="px-4 py-3 text-positive">
                  {row.stage === "EVALUATION" ? (
                    <span className="text-muted">—</span>
                  ) : (
                    formatCurrency(row.payout)
                  )}
                </td>
                <td className="px-4 py-3">{row.actions}</td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-muted">
                  {rows.length === 0
                    ? "Aún no tienes cuentas registradas"
                    : "Ninguna cuenta coincide con el filtro"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
