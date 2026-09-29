interface KpiCardProps {
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "positive" | "negative";
}

const toneClasses: Record<NonNullable<KpiCardProps["tone"]>, string> = {
  neutral: "text-foreground",
  positive: "text-positive",
  negative: "text-negative",
};

export function KpiCard({ label, value, hint, tone = "neutral" }: KpiCardProps) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${toneClasses[tone]}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}
