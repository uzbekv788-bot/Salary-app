"use client";

import { Repeat } from "lucide-react";
import { CategoryIcon } from "@/components/ui/category-icon";
import { useAddTransaction } from "@/components/transactions/add-transaction-provider";
import { useI18n } from "@/components/i18n/locale-provider";
import type { TransactionDTO } from "@/lib/queries/finance";
import { cn } from "@/lib/utils";

/** Строка операции (design.md §7.3). Клик — редактирование. */
export function TransactionRow({
  tx,
  currency,
  meta,
}: {
  tx: TransactionDTO;
  currency: string;
  meta?: string;
}) {
  const { openForm } = useAddTransaction();
  const { t, fmt } = useI18n();
  const amount = tx.type === "INCOME" ? tx.amount : -tx.amount;
  return (
    <li>
      <button
        type="button"
        onClick={() => openForm(tx)}
        className="hover:bg-foreground/5 focus-visible:ring-ring flex min-h-14 w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors outline-none focus-visible:ring-2"
      >
        <CategoryIcon icon={tx.category.icon} color={tx.category.color} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-[15px] font-semibold">
            <span className="truncate">{tx.category.name}</span>
            {tx.recurringId && (
              <Repeat
                className="text-muted-foreground size-3.5 shrink-0"
                aria-label={t("tx.recurringAria")}
              />
            )}
          </span>
          <span className="text-muted-foreground block truncate text-[13px]">
            {[tx.note, meta].filter(Boolean).join(" · ") || " "}
          </span>
        </span>
        <span className="text-right">
          <span
            className={cn(
              "num block text-[15px] font-semibold",
              amount > 0 ? "text-income" : "text-expense",
            )}
          >
            {fmt.money(amount, currency, { signed: true })}
          </span>
          <span className="text-muted-foreground block text-[13px]">{tx.wallet.name}</span>
        </span>
      </button>
    </li>
  );
}
