"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  pendingLabel = "Guardando…",
  className,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className={`${className ?? ""} disabled:cursor-not-allowed disabled:opacity-60`}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
