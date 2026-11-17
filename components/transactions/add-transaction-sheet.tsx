"use client";

import Link from "next/link";
import { ResponsiveSheet } from "@/components/ui/responsive-sheet";
import { Button } from "@/components/ui/button";
import { useAddTransaction } from "@/components/transactions/add-transaction-provider";
import { TransactionForm } from "@/components/transactions/transaction-form";
import type { CategoryDTO, WalletDTO } from "@/lib/queries/finance";

export function AddTransactionSheet(props: {
  categories: CategoryDTO[];
  wallets: WalletDTO[];
  today: string;
  currency: string;
}) {
  const { open, setOpen, editing } = useAddTransaction();
  const ready = props.wallets.some((w) => !w.archived) && props.categories.length > 0;
  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={setOpen}
      title={editing ? "Изменить операцию" : "Новая операция"}
    >
      {ready ? (
        // key — сбрасываем состояние формы при каждом открытии
        <TransactionForm
          key={`${editing?.id ?? "new"}-${open}`}
          {...props}
          initial={editing}
          onDone={() => setOpen(false)}
        />
      ) : (
        <div className="text-muted-foreground grid gap-3 py-4 text-sm">
          Сначала нужен хотя бы один счёт и категория.
          <Button asChild variant="secondary" onClick={() => setOpen(false)}>
            <Link href="/settings">Открыть настройки</Link>
          </Button>
        </div>
      )}
    </ResponsiveSheet>
  );
}
