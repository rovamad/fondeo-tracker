"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { EquityPoint } from "@/lib/metrics";
import { formatCurrency } from "@/lib/format";

export function EquityChart({ data }: { data: EquityPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center text-sm text-muted">
        Sin movimientos en este rango
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={288}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis dataKey="date" stroke="var(--color-muted)" fontSize={12} minTickGap={24} />
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
        <Line
          type="monotone"
          dataKey="cumulativeNet"
          name="Ganancia neta"
          stroke="var(--color-accent)"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="cumulativePayout"
          name="Retiros"
          stroke="var(--color-positive)"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="cumulativeExpense"
          name="Gastos"
          stroke="var(--color-negative)"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
