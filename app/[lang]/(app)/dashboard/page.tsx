import { Suspense } from "react";
import Link from "@/components/i18n/link";
import { ArrowRight, OctagonAlert, Sparkles, TriangleAlert } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { CategoryDonut, TrendAreaChart } from "@/components/charts/lazy";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { AddTransactionButton } from "@/components/transactions/add-transaction-button";
import { TransactionRow } from "@/components/transactions/transaction-row";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getI18n } from "@/lib/i18n/server";
import { percentChange, savingsRate } from "@/lib/money";
import { getPeriod } from "@/lib/period-server";
import { getBudgetsProgress, getByCategory, getKpis, getTrend } from "@/lib/queries/analytics";
import { Progress } from "@/components/ui/progress";
import { listTransactions, listWallets } from "@/lib/queries/finance";
import { listGoals, listRecurring } from "@/lib/queries/planning";
import { GoalsCard, UpcomingCard } from "@/components/dashboard/planning-widgets";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("dash.title") };
}
const nums = (xs: (number | null)[]) => xs.filter((x): x is number => x !== null);

export default async function DashboardPage({ searchParams }: PageProps<"/[lang]/dashboard">) {
  return (
    <>
      <PageHeader title={(await getI18n()).t("dash.title")} searchParams={searchParams} />
      <Suspense fallback={<PageSkeleton kpis />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Content({
  searchParams,
}: {
  searchParams: PageProps<"/[lang]/dashboard">["searchParams"];
}) {
  const [{ user, period, today }, { t, fmt, locale }] = await Promise.all([
    getPeriod(searchParams),
    getI18n(),
  ]);
  const [kpis, trend, byCat, recent, wallets, budgets, rules, goals] = await Promise.all([
    getKpis(user.id, period),
    getTrend(user.id, period, today, undefined, { lang: locale, weekOf: t("chart.weekOf") }),
    getByCategory(user.id, period, "EXPENSE", 5, undefined, (n) => t("dash.other", { n })),
    listTransactions(user.id, {}, 6),
    listWallets(user.id),
    getBudgetsProgress(user.id, `${today.slice(0, 7)}-01`),
    listRecurring(user.id),
    listGoals(user.id),
  ]);
  const alerts = budgets.filter((b) => b.status !== "ok");
  const cur = user.currency;

  if (recent.total === 0)
    return (
      <Card>
        <EmptyState
          icon={Sparkles}
          title={t("dash.empty")}
          description={t("dash.emptyText")}
          action={<AddTransactionButton label={t("nav.addTransaction")} />}
        />
      </Card>
    );

  const rate = savingsRate(kpis.income, kpis.expense);
  const prevRate = savingsRate(kpis.prevIncome, kpis.prevExpense);
  const net = kpis.income - kpis.expense;
  const summary = t("dash.summary", {
    period: period.label,
    income: fmt.money(kpis.income, cur),
    expense: fmt.money(kpis.expense, cur),
    net: fmt.money(net, cur, { signed: true }),
  });

  return (
    <div className="grid gap-3 sm:gap-5">
      <section
        aria-label={t("dash.kpis")}
        className="grid gap-3 sm:grid-cols-2 sm:gap-5 xl:grid-cols-4"
      >
        <KpiCard
          index={0}
          label={t("common.balance")}
          value={kpis.balance}
          format="money"
          currency={cur}
          delta={percentChange(kpis.balance, kpis.prevBalance)}
          spark={nums(trend.map((p) => p.balance))}
          sparkTone="chart-balance"
        />
        <KpiCard
          index={1}
          label={t("common.income")}
          value={kpis.income}
          format="money"
          currency={cur}
          delta={percentChange(kpis.income, kpis.prevIncome)}
          spark={nums(trend.map((p) => p.income))}
          sparkTone="chart-income"
        />
        <KpiCard
          index={2}
          label={t("common.expense")}
          value={kpis.expense}
          format="money"
          currency={cur}
          delta={percentChange(kpis.expense, kpis.prevExpense)}
          invert
          spark={nums(trend.map((p) => p.expense))}
          sparkTone="chart-expense"
        />
        <KpiCard
          index={3}
          label={t("dash.savingsRate")}
          value={rate ?? 0}
          format="percent"
          currency={cur}
          delta={rate !== null && prevRate !== null ? rate - prevRate : null}
        />
      </section>

      <div className="grid gap-3 sm:gap-5 xl:grid-cols-12">
        <Card className="xl:col-span-8">
          <CardHeader className="mb-2">
            <CardTitle>{t("dash.trend")}</CardTitle>
            <span className="text-muted-foreground text-[13px]">{period.label}</span>
          </CardHeader>
          <TrendAreaChart
            data={trend}
            currency={cur}
            summary={summary}
            cumulative={period.granularity === "day"}
          />
        </Card>

        <Card className="xl:col-span-4">
          <CardHeader>
            <CardTitle>{t("dash.byCategory")}</CardTitle>
          </CardHeader>
          {byCat.total > 0 ? (
            <CategoryDonut
              slices={byCat.slices}
              total={byCat.total}
              currency={cur}
              centerLabel={t("common.expense")}
            />
          ) : (
            <p className="text-muted-foreground py-10 text-center text-sm">
              {t("dash.noExpenses")}
            </p>
          )}
        </Card>

        <Card className="p-2 sm:p-3 xl:col-span-8">
          <CardHeader className="mb-1 px-2 pt-2">
            <CardTitle>{t("dash.recent")}</CardTitle>
            <Link
              href="/transactions"
              className="text-primary focus-visible:ring-ring inline-flex items-center gap-1 rounded-full text-sm font-semibold outline-none hover:underline focus-visible:ring-2"
            >
              {t("dash.allTx")} <ArrowRight className="size-4" />
            </Link>
          </CardHeader>
          <ul>
            {recent.items.map((tx) => (
              <TransactionRow key={tx.id} tx={tx} currency={cur} meta={fmt.short(tx.date)} />
            ))}
          </ul>
        </Card>

        <div className="grid content-start gap-3 sm:gap-5 xl:col-span-4">
          <UpcomingCard rules={rules} today={today} currency={cur} />
          <GoalsCard goals={goals} currency={cur} />
          {alerts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{t("dash.budgets")}</CardTitle>
                <Link
                  href="/budgets"
                  className="text-primary text-sm font-semibold hover:underline"
                >
                  {t("common.all")}
                </Link>
              </CardHeader>
              <ul className="grid gap-4">
                {alerts.slice(0, 3).map((b) => (
                  <li key={b.id} className="grid gap-1.5">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="inline-flex min-w-0 items-center gap-1.5 font-medium">
                        {b.status === "over" ? (
                          <OctagonAlert
                            className="text-expense size-4 shrink-0"
                            aria-label={t("dash.over")}
                          />
                        ) : (
                          <TriangleAlert
                            className="text-warning size-4 shrink-0"
                            aria-label={t("dash.warning")}
                          />
                        )}
                        <span className="truncate">{b.name}</span>
                      </span>
                      <span className="num text-muted-foreground">
                        {fmt.money(b.spent, cur)} / {fmt.money(b.limit, cur)}
                      </span>
                    </div>
                    <Progress
                      value={b.pct * 100}
                      tone={b.status === "over" ? "expense" : "warning"}
                      aria-label={`${b.name}: ${Math.round(b.pct * 100)}%`}
                    />
                  </li>
                ))}
              </ul>
            </Card>
          )}
          <Card>
            <CardHeader>
              <CardTitle>{t("dash.wallets")}</CardTitle>
              <Link href="/settings" className="text-primary text-sm font-semibold hover:underline">
                {t("common.manage")}
              </Link>
            </CardHeader>
            <ul className="grid gap-3">
              {wallets.map((w) => (
                <li key={w.id} className="flex items-center justify-between gap-3 text-[15px]">
                  <span className="truncate font-medium">{w.name}</span>
                  <span className={`num font-semibold ${w.balance < 0 ? "text-expense" : ""}`}>
                    {fmt.money(w.balance, cur)}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
