"use client";

import Link from "@/components/i18n/link";
import { ResponsiveSheet } from "@/components/ui/responsive-sheet";
import { Button } from "@/components/ui/button";
import { useAddTransaction } from "@/components/transactions/add-transaction-provider";
import { TransactionForm } from "@/components/transactions/transaction-form";
import type { CategoryDTO, WalletDTO } from "@/lib/queries/finance";
import { useI18n } from "@/components/i18n/locale-provider";

export function AddTransactionSheet(props: {
  categories: CategoryDTO[];
  wallets: WalletDTO[];
  today: string;
  currency: string;
  userId: string;
}) {
  const { open, setOpen, editing } = useAddTransaction();
  const { t } = useI18n();
  const ready = props.wallets.some((w) => !w.archived) && props.categories.length > 0;
  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={setOpen}
      title={editing ? t("tx.editTitle") : t("tx.newTitle")}
    >
      {ready ? (
        // key — сбрасываем состояние формы при каждом открытии
        <TransactionForm
          key={`${editing?.id ?? "new"}-${open}`}
          {...props}
          initial={editing}
          userId={props.userId}
          onDone={() => setOpen(false)}
        />
      ) : (
        <div className="text-muted-foreground grid gap-3 py-4 text-sm">
          {t("tx.needSetup")}
          <Button asChild variant="secondary" onClick={() => setOpen(false)}>
            <Link href="/settings">{t("tx.openSettings")}</Link>
          </Button>
        </div>
      )}
    </ResponsiveSheet>
  );
}
