export interface ResolvedRange {
  from?: Date;
  to?: Date;
}

export type PresetKey = "todo" | "mes" | "3m" | "anio" | "custom";

const PRESET_LABELS: Record<PresetKey, string> = {
  todo: "Todo",
  mes: "Este mes",
  "3m": "Últimos 3 meses",
  anio: "Este año",
  custom: "Personalizado",
};

export function presetOptions(): { key: PresetKey; label: string }[] {
  return (Object.keys(PRESET_LABELS) as PresetKey[])
    .filter((k) => k !== "custom")
    .map((key) => ({ key, label: PRESET_LABELS[key] }));
}

export function resolveRange(searchParams: {
  preset?: string;
  from?: string;
  to?: string;
}): { range: ResolvedRange; preset: PresetKey } {
  if (searchParams.from || searchParams.to) {
    return {
      preset: "custom",
      range: {
        from: searchParams.from ? new Date(searchParams.from) : undefined,
        to: searchParams.to ? endOfDay(new Date(searchParams.to)) : undefined,
      },
    };
  }

  const preset = (searchParams.preset as PresetKey) || "todo";
  const now = new Date();

  switch (preset) {
    case "mes": {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      return { preset, range: { from } };
    }
    case "3m": {
      const from = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      return { preset, range: { from } };
    }
    case "anio": {
      const from = new Date(now.getFullYear(), 0, 1);
      return { preset, range: { from } };
    }
    case "todo":
    default:
      return { preset: "todo", range: {} };
  }
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}
