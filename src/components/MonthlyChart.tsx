"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MonthlyPoint } from "@/lib/metrics";
import { formatCurrency } from "@/lib/format";

export function MonthlyChart({ data }: { data: MonthlyPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center text-sm text-muted">
        Sin movimientos en este rango
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={288}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis dataKey="month" stroke="var(--color-muted)" fontSize={12} />
        <YAxis
          stroke="var(--color-muted)"
          fontSize={12}
          tickFormatter={(v) => formatCurrency(v)}
        />
        <Tooltip
          contentStyle={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: 8,
          }}
          formatter={(value) => formatCurrency(Number(value))}
        />
        <Legend />
        <Bar dataKey="payout" name="Retiros" fill="var(--color-positive)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="expense" name="Gastos" fill="var(--color-negative)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
