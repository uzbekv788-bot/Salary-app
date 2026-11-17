import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeftRight, SearchX } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { AddTransactionButton } from "@/components/transactions/add-transaction-button";
import { TransactionFilters } from "@/components/transactions/transaction-filters";
import { TransactionRow } from "@/components/transactions/transaction-row";
import { Button } from "@/components/ui/button";
import { Card, Overline } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { dayLabel } from "@/lib/format-date";
import { formatMoney } from "@/lib/money";
import { getPeriod } from "@/lib/period-server";
import {
  listCategories,
  listTransactions,
  listWallets,
  type TransactionDTO,
} from "@/lib/queries/finance";
import { cn } from "@/lib/utils";

export const metadata = { title: "Операции" };
const PAGE = 50;

export default function TransactionsPage({ searchParams }: PageProps<"/transactions">) {
  return (
    <>
      <PageHeader title="Операции" searchParams={searchParams} />
      <Suspense fallback={<PageSkeleton />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </>
  );
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;

async function Content({
  searchParams,
}: {
  searchParams: PageProps<"/transactions">["searchParams"];
}) {
  const { user, params, period, today } = await getPeriod(searchParams);
  const limit = Math.min(Math.max(Number(one(params.limit)) || PAGE, PAGE), 1000);
  const rawType = one(params.type);
  const filters = {
    from: period.from,
    to: period.to,
    type: rawType === "INCOME" || rawType === "EXPENSE" ? rawType : undefined,
    categoryId: one(params.category),
    walletId: one(params.wallet),
    q: one(params.q)?.slice(0, 100),
  } as const;

  const [{ items, total, income, expense }, categories, wallets] = await Promise.all([
    listTransactions(user.id, filters, limit),
    listCategories(user.id, { includeArchived: true }),
    listWallets(user.id, { includeArchived: true }),
  ]);
  const filtered = Boolean(filters.type || filters.categoryId || filters.walletId || filters.q);

  // Группировка по дням с итогом дня
  const days = new Map<string, TransactionDTO[]>();
  for (const tx of items) days.set(tx.date, [...(days.get(tx.date) ?? []), tx]);

  const moreParams = new URLSearchParams(
    Object.entries(params).flatMap(([k, v]) => (typeof v === "string" ? [[k, v]] : [])),
  );
  moreParams.set("limit", String(limit + PAGE));

  return (
    <>
      <TransactionFilters categories={categories} wallets={wallets} />

      <div className="mb-5 grid grid-cols-3 gap-3">
        <Summary
          label="Доходы"
          value={formatMoney(income, user.currency)}
          className="text-income"
        />
        <Summary
          label="Расходы"
          value={formatMoney(-expense, user.currency)}
          className="text-expense"
        />
        <Summary
          label="Итого"
          value={formatMoney(income - expense, user.currency, { signed: true })}
        />
      </div>

      {items.length === 0 ? (
        <Card>
          {filtered ? (
            <EmptyState
              icon={SearchX}
              title="Ничего не нашлось"
              description="Попробуйте изменить фильтры или период."
            />
          ) : (
            <EmptyState
              icon={ArrowLeftRight}
              title="Пока нет операций"
              description="Добавьте первую — и здесь появится история, а на дашборде аналитика."
              action={<AddTransactionButton label="Добавить операцию" />}
            />
          )}
        </Card>
      ) : (
        <div className="grid gap-4">
          {[...days].map(([date, txs]) => {
            const net = txs.reduce((s, t) => s + (t.type === "INCOME" ? t.amount : -t.amount), 0);
            return (
              <Card key={date} className="p-2 sm:p-3">
                <div className="flex items-baseline justify-between px-2 pt-1 pb-1.5">
                  <h2 className="text-sm font-semibold first-letter:uppercase">
                    {dayLabel(date, today)}
                  </h2>
                  <span
                    className={cn(
                      "num text-[13px] font-medium",
                      net >= 0 ? "text-income" : "text-muted-foreground",
                    )}
                  >
                    {formatMoney(net, user.currency, { signed: true })}
                  </span>
                </div>
                <ul>
                  {txs.map((tx) => (
                    <TransactionRow key={tx.id} tx={tx} currency={user.currency} />
                  ))}
                </ul>
              </Card>
            );
          })}
          {total > items.length && (
            <Button asChild variant="secondary" className="mx-auto">
              <Link href={`?${moreParams}`} scroll={false}>
                Показать ещё ({total - items.length})
              </Link>
            </Button>
          )}
        </div>
      )}
      <p className="text-muted-foreground mt-4 text-center text-[13px]">
        {period.label} · операций: {total}
      </p>
    </>
  );
}

function Summary({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <Card className="p-3 sm:p-4">
      <Overline>{label}</Overline>
      <p className={cn("num mt-1 truncate text-sm font-bold sm:text-xl", className)}>{value}</p>
    </Card>
  );
}
