"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAddTransaction } from "@/components/transactions/add-transaction-provider";
import { useI18n } from "@/components/i18n/locale-provider";

export function AddTransactionButton({ className, label }: { className?: string; label?: string }) {
  const { openForm } = useAddTransaction();
  const { t } = useI18n();
  return (
    <Button
      onClick={() => openForm()}
      className={className}
      aria-keyshortcuts="N"
      title={t("tx.addHint")}
    >
      <Plus /> {label ?? t("common.add")}
    </Button>
  );
}
