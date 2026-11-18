import { Suspense } from "react";
import { addMonths, differenceInCalendarDays, endOfMonth, format, startOfMonth } from "date-fns";
import { PageHeader } from "@/components/layout/page-header";
import { getI18n } from "@/lib/i18n/server";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { BudgetManager } from "@/components/budgets/budget-manager";
import { getBudgetsProgress } from "@/lib/queries/analytics";
import { listCategories } from "@/lib/queries/finance";
import { parseDate, todayIn } from "@/lib/period";
import { requireUser } from "@/lib/session";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("budget.title") };
}

export default async function BudgetsPage({ searchParams }: PageProps<"/[lang]/budgets">) {
  return (
    <>
      <PageHeader title={(await getI18n()).t("budget.title")} />
      <Suspense fallback={<PageSkeleton />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Content({
  searchParams,
}: {
  searchParams: PageProps<"/[lang]/budgets">["searchParams"];
}) {
  const [user, params] = await Promise.all([requireUser(), searchParams]);
  const today = parseDate(todayIn(user.timezone))!;
  const raw =
    typeof params.month === "string" && /^\d{4}-\d{2}$/.test(params.month)
      ? parseDate(`${params.month}-01`)
      : null;
  const m = startOfMonth(raw ?? today);
  const month = format(m, "yyyy-MM-dd");
  const isCurrent = format(m, "yyyy-MM") === format(today, "yyyy-MM");
  const next = addMonths(m, 1);

  const [budgets, categories] = await Promise.all([
    getBudgetsProgress(user.id, month),
    listCategories(user.id),
  ]);
  const { fmt } = await getI18n();
  const label = format(m, "LLLL yyyy", { locale: fmt.dateLocale });
  return (
    <BudgetManager
      budgets={budgets}
      categories={categories}
      month={month}
      monthLabel={label.charAt(0).toUpperCase() + label.slice(1)}
      daysLeft={isCurrent ? differenceInCalendarDays(endOfMonth(today), today) + 1 : null}
      prevMonth={format(addMonths(m, -1), "yyyy-MM")}
      nextMonth={next <= addMonths(startOfMonth(today), 1) ? format(next, "yyyy-MM") : null}
      currency={user.currency}
    />
  );
}
