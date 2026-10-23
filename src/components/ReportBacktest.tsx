"use client";

import { useMemo, useState } from "react";
import { KpiCard } from "@/components/KpiCard";
import {
  historyStats,
  parseNinjaTraderReport,
  replayRolling,
  replaySequential,
  summarizeBacktest,
  type HistoryDay,
} from "@/lib/backtest";
import { formatCurrency, formatPct } from "@/lib/format";
import type { SimParams } from "@/lib/simulator";

const OUTCOME = {
  passed: { label: "Pasada", color: "#22c55e" },
  failed: { label: "Quemada", color: "#ef4444" },
  incomplete: { label: "Sin resolver", color: "#6b7a99" },
};

/**
 * Backtest opcional: reproduce un reporte real de operaciones (CSV diario del Grid de
 * NinjaTrader) con las mismas reglas configuradas en el simulador.
 */
export function ReportBacktest({ params }: { params: SimParams }) {
  const [history, setHistory] = useState<HistoryDay[] | null>(null);
  const [reportName, setReportName] = useState("");
  const [error, setError] = useState("");

  async function loadReport(file: File | undefined) {
    if (!file) return;
    try {
      const days = parseNinjaTraderReport(await file.text());
      if (days.length === 0) throw new Error("El reporte no tiene días.");
      setHistory(days);
      setReportName(file.name);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo leer el archivo.");
    }
  }

  const stats = useMemo(() => (history ? historyStats(history) : null), [history]);
  const result = useMemo(() => {
    if (!history || !stats) return null;
    const accounts = replaySequential(history, params);
    return {
      accounts,
      summary: summarizeBacktest(accounts, params, stats),
      rolling: summarizeBacktest(replayRolling(history, params), params, stats),
    };
  }, [history, stats, params]);

  return (
    <details className="rounded-lg border border-border bg-surface">
      <summary className="cursor-pointer select-none px-4 py-3 text-sm text-muted hover:text-foreground">
        Probar con un reporte de operaciones <span className="text-xs">(opcional)</span>
      </summary>
      <div className="flex flex-col gap-4 border-t border-border p-4">
        <div className="flex flex-col gap-2">
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => {
              void loadReport(e.target.files?.[0]);
              e.target.value = "";
            }}
            className="text-sm text-muted file:mr-3 file:rounded-md file:border file:border-border file:bg-background file:px-3 file:py-2 file:text-sm file:text-foreground"
          />
          <p className="text-xs text-muted">
            CSV del Grid de NinjaTrader con Period = Day. Se reproduce día a día con las reglas
            configuradas arriba (balance, drawdown, objetivo, costes, cobros y su límite).
          </p>
          {error && <p className="text-xs text-negative">{error}</p>}
        </div>

        {stats && result && (
          <>
            <div className="flex flex-col gap-1 text-xs text-muted">
              <span className="break-all font-medium text-foreground">{reportName}</span>
              <span>
                {stats.days} días · {stats.from} → {stats.to} · {stats.totalTrades} trades · neto{" "}
                {formatCurrency(stats.totalNet)} · PF {stats.profitFactor.toFixed(2)} ·{" "}
                {formatPct(stats.winDaysPct)} días ganadores
              </span>
              <span>
                Mejor día {formatCurrency(stats.bestDay)} · peor día {formatCurrency(stats.worstDay)} ·
                peor DD intradía {formatCurrency(stats.worstIntradayDrawdown)}
              </span>
              <button
                type="button"
                onClick={() => {
                  setHistory(null);
                  setReportName("");
                }}
                className="mt-1 self-start rounded-md border border-border px-3 py-1.5 transition-colors hover:bg-surface-hover hover:text-foreground"
              >
                Quitar reporte
              </button>
            </div>

            <p className="text-xs text-muted">
              Compra una cuenta nueva cada vez que la anterior se quema o termina. Dentro del día se
              usa el peor punto del reporte (Max. drawdown), así que es conservador con el trailing.
            </p>

            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              <KpiCard
                compact
                label="Cuentas compradas"
                value={`${result.accounts.length}`}
                hint={`${result.summary.passedCount} pasaron · ${result.summary.failedCount} quemadas · ${result.summary.incompleteCount} sin resolver`}
              />
              <KpiCard
                compact
                label="Neto histórico"
                value={formatCurrency(result.summary.totalNet)}
                hint={`Cobros ${formatCurrency(result.summary.avgCashPerAccount * result.accounts.length)} − costes ${formatCurrency(result.summary.avgCostPerAccount * result.accounts.length)}`}
                tone={result.summary.totalNet >= 0 ? "positive" : "negative"}
              />
              <KpiCard
                compact
                label="Pasa si empiezas cualquier día"
                value={formatPct(result.rolling.passedPct)}
                hint={`Queman ${formatPct(result.rolling.failedPct)} · ${formatPct(result.rolling.incompletePct)} sin resolver (${result.rolling.runs} fechas)`}
                tone={result.rolling.passedPct >= result.rolling.failedPct ? "positive" : "negative"}
              />
              <KpiCard
                compact
                label="Neto por cuenta (cualquier inicio)"
                value={formatCurrency(result.rolling.avgNetPerAccount)}
                hint={`ROI ${formatPct(result.rolling.roiPct, 0)} · ${formatPct(result.rolling.fundedWithPayoutPct)} de las fondeadas cobran`}
                tone={result.rolling.avgNetPerAccount >= 0 ? "positive" : "negative"}
              />
            </div>

            <div className="max-h-96 overflow-auto rounded-lg border border-border">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="sticky top-0 border-b border-border bg-surface text-xs uppercase text-muted">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Inicio</th>
                    <th className="px-4 py-3">Prueba</th>
                    <th className="px-4 py-3">Días</th>
                    <th className="px-4 py-3">Cobros</th>
                    <th className="px-4 py-3">Cobrado</th>
                    <th className="px-4 py-3">Neto</th>
                  </tr>
                </thead>
                <tbody>
                  {result.accounts.map((a, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="px-4 py-2">{i + 1}</td>
                      <td className="px-4 py-2">{a.startDate}</td>
                      <td className="px-4 py-2" style={{ color: OUTCOME[a.outcome].color }}>
                        {OUTCOME[a.outcome].label}
                        {a.fundedOutcome === "failed" ? " · fondeada quemada" : ""}
                      </td>
                      <td className="px-4 py-2">{a.daysUsed}</td>
                      <td className="px-4 py-2">{a.payoutCount}</td>
                      <td className="px-4 py-2">{formatCurrency(a.cash)}</td>
                      <td
                        className={`px-4 py-2 font-medium ${a.net >= 0 ? "text-positive" : "text-negative"}`}
                      >
                        {formatCurrency(a.net)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </details>
  );
}
