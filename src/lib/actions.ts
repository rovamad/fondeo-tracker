"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { parseDateInput, todayDate } from "@/lib/format";
import type {
  AccountStage,
  AccountStatus,
  ExpenseCategory,
} from "@/generated/prisma/enums";

function str(formData: FormData, key: string): string {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Falta el campo "${key}"`);
  }
  return value.trim();
}

function optionalStr(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim() === "") return undefined;
  return value.trim();
}

function num(formData: FormData, key: string): number {
  const value = Number(str(formData, key));
  if (Number.isNaN(value)) throw new Error(`El campo "${key}" debe ser numérico`);
  return value;
}

export async function createAccount(formData: FormData) {
  const firm = str(formData, "firm");
  const size = num(formData, "size");
  const cost = num(formData, "cost");
  const label = optionalStr(formData, "label");
  const notes = optionalStr(formData, "notes");
  const purchasedAtRaw = optionalStr(formData, "purchasedAt");
  const purchasedAt = parseDateInput(purchasedAtRaw);

  await prisma.account.create({
    data: {
      firm,
      size,
      label,
      notes,
      purchasedAt,
      transactions: {
        create: [
          {
            type: "EXPENSE",
            category: "EVALUATION",
            amount: cost,
            date: purchasedAt,
          },
        ],
      },
    },
  });

  revalidatePath("/cuentas");
  revalidatePath("/");
  redirect("/cuentas");
}

export async function updateAccountStage(accountId: string, stage: AccountStage) {
  await prisma.account.update({
    where: { id: accountId },
    data: {
      stage,
      fundedAt: stage === "FUNDED" ? todayDate() : undefined,
    },
  });
  revalidatePath("/cuentas");
  revalidatePath(`/cuentas/${accountId}`);
  revalidatePath("/");
}

export async function promoteToLive(accountId: string, formData: FormData) {
  const costRaw = optionalStr(formData, "activationCost");
  const cost = costRaw ? Number(costRaw) : 0;
  if (Number.isNaN(cost) || cost < 0) {
    throw new Error('El campo "activationCost" debe ser un número positivo');
  }
  const newLabel = optionalStr(formData, "liveLabel");
  const now = todayDate();

  const current = await prisma.account.findUniqueOrThrow({
    where: { id: accountId },
    select: { label: true },
  });
  const renamed = newLabel !== undefined && newLabel !== current.label;

  await prisma.$transaction([
    prisma.account.update({
      where: { id: accountId },
      data: {
        stage: "FUNDED",
        fundedAt: now,
        ...(renamed ? { label: newLabel, evaluationLabel: current.label } : {}),
      },
    }),
    ...(cost > 0
      ? [
          prisma.transaction.create({
            data: {
              accountId,
              type: "EXPENSE",
              category: "ACTIVATION",
              amount: cost,
              date: now,
            },
          }),
        ]
      : []),
  ]);

  revalidatePath("/cuentas");
  revalidatePath(`/cuentas/${accountId}`);
  revalidatePath("/movimientos");
  revalidatePath("/");
}

export async function updateAccountStatus(accountId: string, status: AccountStatus) {
  await prisma.account.update({
    where: { id: accountId },
    data: {
      status,
      failedAt: status === "FAILED" ? todayDate() : undefined,
    },
  });
  revalidatePath("/cuentas");
  revalidatePath(`/cuentas/${accountId}`);
  revalidatePath("/");
}

export async function deleteAccount(accountId: string) {
  await prisma.account.delete({ where: { id: accountId } });
  revalidatePath("/cuentas");
  revalidatePath("/");
  redirect("/cuentas");
}

export async function createTransaction(formData: FormData) {
  const accountId = str(formData, "accountId");
  const type = str(formData, "type") as "EXPENSE" | "PAYOUT";
  const amount = num(formData, "amount");
  const dateRaw = optionalStr(formData, "date");
  const date = parseDateInput(dateRaw);
  const note = optionalStr(formData, "note");
  const categoryRaw = optionalStr(formData, "category");
  const category =
    type === "EXPENSE" ? ((categoryRaw ?? "OTHER") as ExpenseCategory) : undefined;

  await prisma.transaction.create({
    data: { accountId, type, amount, date, note, category },
  });

  revalidatePath("/movimientos");
  revalidatePath(`/cuentas/${accountId}`);
  revalidatePath("/cuentas");
  revalidatePath("/");
}

export async function deleteTransaction(transactionId: string, accountId: string) {
  await prisma.transaction.delete({ where: { id: transactionId } });
  revalidatePath("/movimientos");
  revalidatePath(`/cuentas/${accountId}`);
  revalidatePath("/cuentas");
  revalidatePath("/");
}
