import { Suspense } from "react";
import { PeriodPicker } from "@/components/layout/period-picker";
import { AddTransactionButton } from "@/components/transactions/add-transaction-button";
import { Skeleton } from "@/components/ui/skeleton";
import { getPeriod } from "@/lib/period-server";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * Шапка страницы (design.md §6): H1 + переключатель периода + «Добавить» (десктоп).
 * Заголовок рендерится сразу (статическая оболочка), период — после чтения сессии.
 */
export function PageHeader({
  title,
  searchParams,
  showAdd = true,
  actions,
}: {
  title: string;
  searchParams?: SearchParams;
  showAdd?: boolean;
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-5 flex flex-wrap items-center justify-between gap-3 sm:mb-6">
      <h1 className="text-[28px] leading-9 font-bold">{title}</h1>
      <div className="flex flex-wrap items-center gap-3">
        {searchParams && (
          <Suspense fallback={<Skeleton className="h-11 w-56 rounded-full" />}>
            <PeriodControl searchParams={searchParams} />
          </Suspense>
        )}
        {actions}
        {showAdd && <AddTransactionButton className="hidden md:inline-flex" />}
      </div>
    </header>
  );
}

async function PeriodControl({ searchParams }: { searchParams: SearchParams }) {
  const { period } = await getPeriod(searchParams);
  return <PeriodPicker period={period} />;
}
