import type { AccountStage, AccountStatus } from "@/generated/prisma/enums";

const stageLabels: Record<AccountStage, string> = {
  EVALUATION: "Evaluación",
  FUNDED: "Live",
};

const statusStyles: Record<AccountStatus, string> = {
  ACTIVE: "bg-accent/15 text-accent",
  FAILED: "bg-negative/15 text-negative",
  CLOSED: "bg-muted/15 text-muted",
};

const statusLabels: Record<AccountStatus, string> = {
  ACTIVE: "Activa",
  FAILED: "Quemada",
  CLOSED: "Cerrada",
};

export function StageBadge({ stage }: { stage: AccountStage }) {
  return (
    <span className="rounded-full bg-surface-hover px-2 py-0.5 text-xs font-medium text-foreground">
      {stageLabels[stage]}
    </span>
  );
}

export function StatusBadge({ status }: { status: AccountStatus }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[status]}`}>
      {statusLabels[status]}
    </span>
  );
}
