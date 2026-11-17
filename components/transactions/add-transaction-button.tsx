"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAddTransaction } from "@/components/transactions/add-transaction-provider";

export function AddTransactionButton({
  className,
  label = "Добавить",
}: {
  className?: string;
  label?: string;
}) {
  const { openForm } = useAddTransaction();
  return (
    <Button
      onClick={() => openForm()}
      className={className}
      aria-keyshortcuts="N"
      title="Добавить операцию (N)"
    >
      <Plus /> {label}
    </Button>
  );
}
