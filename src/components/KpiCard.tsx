interface KpiCardProps {
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "positive" | "negative";
  compact?: boolean;
}

const toneClasses: Record<NonNullable<KpiCardProps["tone"]>, string> = {
  neutral: "text-foreground",
  positive: "text-positive",
  negative: "text-negative",
};

export function KpiCard({ label, value, hint, tone = "neutral", compact = false }: KpiCardProps) {
  if (compact) {
    return (
      <div className="rounded-lg border border-border bg-surface px-3 py-2">
        <p className="truncate text-[10px] uppercase tracking-wide text-muted">{label}</p>
        <p className={`text-lg font-semibold leading-tight ${toneClasses[tone]}`}>{value}</p>
        {hint && <p className="line-clamp-2 text-[10px] leading-tight text-muted" title={hint}>{hint}</p>}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${toneClasses[tone]}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}
