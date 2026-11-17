"use client";

import { ResponsiveSheet } from "@/components/ui/responsive-sheet";
import { useAddTransaction } from "@/components/transactions/add-transaction-provider";

/** Окно «Новая операция». Сама форма — tasks.md 8.3. */
export function AddTransactionSheet({ children }: { children?: React.ReactNode }) {
  const { open, setOpen } = useAddTransaction();
  return (
    <ResponsiveSheet open={open} onOpenChange={setOpen} title="Новая операция">
      {children ?? (
        <p className="text-muted-foreground py-6 text-sm">Форма добавления появится на шаге 8.</p>
      )}
    </ResponsiveSheet>
  );
}
