import Link from "next/link";
import { presetOptions, type PresetKey } from "@/lib/dateRanges";

interface DashboardFiltersProps {
  basePath: string;
  activePreset: PresetKey;
  firms: string[];
  currentFirm?: string;
  currentFrom?: string;
  currentTo?: string;
}

export function DashboardFilters({
  basePath,
  activePreset,
  firms,
  currentFirm,
  currentFrom,
  currentTo,
}: DashboardFiltersProps) {
  const presetHref = (preset: PresetKey) => {
    const params = new URLSearchParams();
    if (preset !== "todo") params.set("preset", preset);
    if (currentFirm) params.set("firm", currentFirm);
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-wrap gap-2">
        {presetOptions().map(({ key, label }) => (
          <Link
            key={key}
            href={presetHref(key)}
            className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
              activePreset === key
                ? "bg-accent text-white"
                : "bg-surface-hover text-muted hover:text-foreground"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      <form method="get" action={basePath} className="flex flex-wrap items-center gap-2">
        <input
          type="date"
          name="from"
          defaultValue={currentFrom}
          className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
        />
        <span className="text-muted text-sm">a</span>
        <input
          type="date"
          name="to"
          defaultValue={currentTo}
          className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
        />
        <select
          name="firm"
          defaultValue={currentFirm ?? ""}
          className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
        >
          <option value="">Todas las firmas</option>
          {firms.map((firm) => (
            <option key={firm} value={firm}>
              {firm}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
        >
          Aplicar
        </button>
      </form>
    </div>
  );
}
