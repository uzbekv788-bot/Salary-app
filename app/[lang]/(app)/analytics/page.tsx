import { Suspense } from "react";
import Link from "@/components/i18n/link";
import { CalendarDays, Flame, Lightbulb, TrendingDown, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { UrlSegmented } from "@/components/analytics/analytics-controls";
import { MonthBars } from "@/components/charts/lazy";
import { Card, CardHeader, CardTitle, Overline } from "@/components/ui/card";
import { CategoryIcon } from "@/components/ui/category-icon";
import { categoryColorVar } from "@/lib/design/category-palette";
import { dayLabel } from "@/lib/format-date";
import { percentChange } from "@/lib/money";
import { getI18n } from "@/lib/i18n/server";
import { rich } from "@/components/i18n/rich";
import { getPeriod } from "@/lib/period-server";
import { getByCategory, getDailyStats, getKpis, getMonthComparison } from "@/lib/queries/analytics";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("analytics.title") };
}

export default async function AnalyticsPage({ searchParams }: PageProps<"/[lang]/analytics">) {
  return (
    <>
      <PageHeader title={(await getI18n()).t("analytics.title")} searchParams={searchParams} />
      <Suspense fallback={<PageSkeleton />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Content({
  searchParams,
}: {
  searchParams: PageProps<"/[lang]/analytics">["searchParams"];
}) {
  const [{ user, params, period, today }, { t, fmt, locale }] = await Promise.all([
    getPeriod(searchParams),
    getI18n(),
  ]);
  const type = params.type === "INCOME" ? "INCOME" : "EXPENSE";
  const months = params.months === "12" ? 12 : 6;
  const cur = user.currency;
  const endOfRange = period.to < today ? period.to : today;

  const [kpis, byCat, prevByCat, monthly, daily] = await Promise.all([
    getKpis(user.id, period),
    getByCategory(user.id, period, type, 100, undefined, (n) => t("dash.other", { n })),
    getByCategory(
      user.id,
      { from: period.prevFrom, to: period.prevTo },
      type,
      100,
      undefined,
      (n) => t("dash.other", { n }),
    ),
    getMonthComparison(user.id, endOfRange, months, locale),
    getDailyStats(user.id, period, today),
  ]);

  // Текстовые выводы (tasks.md 10.4): заметные изменения категорий к прошлому периоду
  const prevMap = new Map(prevByCat.all.map((c) => [c.id, c.total]));
  const changes = byCat.all
    .map((c) => ({ ...c, change: percentChange(c.total, prevMap.get(c.id) ?? 0) }))
    .filter((c) => c.change !== null && Math.abs(c.change) >= 0.15 && c.total >= byCat.total * 0.03)
    .sort((a, b) => Math.abs(b.change!) - Math.abs(a.change!))
    .slice(0, 3);
  const isExpense = type === "EXPENSE";
  const avgPerDay = daily.elapsedDays ? kpis.expense / daily.elapsedDays : 0;
  const best = monthly.reduce(
    (a, b) => (b.income - b.expense > a.income - a.expense ? b : a),
    monthly[0],
  );
  const periodQs = new URLSearchParams(
    Object.entries({
      period: params.period,
      date: params.date,
      from: params.from,
      to: params.to,
    }).flatMap(([k, v]) => (typeof v === "string" ? [[k, v]] : [])),
  );

  const barsSummary =
    t("analytics.barsSummary", { n: months }) +
    " " +
    monthly
      .map((m) => `${m.label}: +${fmt.money(m.income, cur)} / −${fmt.money(m.expense, cur)}`)
      .join("; ");

  // Период для фразы: «ноябрь 2026» / «2026 год» (у каждого языка свой шаблон)
  const periodPhrase =
    period.kind === "year"
      ? t("analytics.yearPeriod", { year: period.label })
      : locale === "en"
        ? period.label
        : period.label.toLowerCase();
  const net = kpis.income - kpis.expense;
  const amount = <b className="num">{fmt.money(Math.abs(net), cur)}</b>;

  return (
    <div className="grid gap-3 sm:gap-5">
      <section aria-label={t("analytics.summary")} className="grid gap-3 sm:grid-cols-3 sm:gap-5">
        <Stat
          icon={CalendarDays}
          label={t("analytics.avgPerDay")}
          value={fmt.money(Math.round(avgPerDay), cur)}
          hint={
            daily.elapsedDays
              ? t("analytics.forDays", { n: daily.elapsedDays })
              : t("analytics.notStarted")
          }
        />
        <Stat
          icon={Flame}
          label={t("analytics.maxDay")}
          value={daily.maxDay ? fmt.money(daily.maxDay.total, cur) : "—"}
          hint={
            daily.maxDay
              ? dayLabel(daily.maxDay.date, today, {
                  fmt,
                  todayLabel: t("tx.today"),
                  yesterdayLabel: t("tx.yesterday"),
                })
              : t("analytics.noExpenses")
          }
        />
        <Stat
          icon={TrendingUp}
          label={t("analytics.bestMonth")}
          value={best ? fmt.money(best.income - best.expense, cur, { signed: true }) : "—"}
          hint={best ? t("analytics.ofLast", { label: best.label, n: months }) : ""}
        />
      </section>

      <div className="grid gap-3 sm:gap-5 xl:grid-cols-12">
        <Card className="xl:col-span-7">
          <CardHeader className="flex-wrap">
            <CardTitle>{t("analytics.mom")}</CardTitle>
            <UrlSegmented
              param="months"
              label={t("analytics.howMany")}
              fallback="6"
              options={[
                { value: "6", label: t("analytics.m6") },
                { value: "12", label: t("analytics.m12") },
              ]}
            />
          </CardHeader>
          <MonthBars data={monthly} currency={cur} summary={barsSummary} />
        </Card>

        <Card className="xl:col-span-5">
          <CardHeader className="flex-wrap">
            <CardTitle>{t("analytics.top")}</CardTitle>
            <UrlSegmented
              param="type"
              label={t("common.type")}
              fallback="EXPENSE"
              options={[
                {
                  value: "EXPENSE",
                  label: t("common.expense"),
                  activeClass: "bg-expense text-expense-foreground",
                },
                {
                  value: "INCOME",
                  label: t("common.income"),
                  activeClass: "bg-income text-income-foreground",
                },
              ]}
            />
          </CardHeader>
          <p className="text-muted-foreground mb-4 text-sm">
            {rich(t("analytics.totalLine"), {
              period: period.label,
              amount: (
                <span className="num text-foreground font-semibold">
                  {fmt.money(byCat.total, cur)}
                </span>
              ),
            })}
          </p>
          {byCat.all.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              {isExpense ? t("analytics.noneExpense") : t("analytics.noneIncome")}
            </p>
          ) : (
            <ol className="grid gap-1">
              {byCat.all.slice(0, 10).map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/transactions?${new URLSearchParams([...periodQs, ["category", c.id]])}`}
                    className="hover:bg-foreground/5 focus-visible:ring-ring grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-1.5 rounded-md p-2 outline-none focus-visible:ring-2"
                  >
                    <CategoryIcon icon={c.icon} color={c.color} size="sm" className="row-span-2" />
                    <span className="truncate text-sm font-semibold">{c.name}</span>
                    <span className="num text-right text-sm font-semibold">
                      {fmt.money(c.total, cur)}
                    </span>
                    <span className="bg-foreground/8 h-2 overflow-hidden rounded-full">
                      <span
                        className="block h-full rounded-full"
                        style={{
                          width: `${Math.max(2, (c.total / byCat.all[0].total) * 100)}%`,
                          background: categoryColorVar(c.color),
                        }}
                      />
                    </span>
                    <span className="num text-muted-foreground text-right text-[13px]">
                      {fmt.percent(c.share)}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="text-warning size-5" /> {t("analytics.insights")}
          </CardTitle>
        </CardHeader>
        <ul className="grid gap-2 text-[15px]">
          <li>
            {net < 0
              ? rich(t("analytics.overspent"), { period: periodPhrase, amount })
              : kpis.income > 0
                ? rich(t("analytics.saved"), {
                    period: periodPhrase,
                    amount,
                    pct: fmt.percent(net / kpis.income),
                  })
                : rich(t("analytics.savedNoIncome"), { period: periodPhrase, amount })}
          </li>
          {changes.map((c) => (
            <li key={c.id} className="flex items-start gap-2">
              {c.change! > 0 ? (
                <TrendingUp className="text-muted-foreground mt-0.5 size-5 shrink-0" aria-hidden />
              ) : (
                <TrendingDown
                  className="text-muted-foreground mt-0.5 size-5 shrink-0"
                  aria-hidden
                />
              )}
              <span>
                {rich(t(isExpense ? "analytics.changeExpense" : "analytics.changeIncome"), {
                  name: c.name,
                  pct: (
                    <b className={isExpense === c.change! > 0 ? "text-expense" : "text-income"}>
                      {fmt.percent(c.change!, { signed: true })}
                    </b>
                  ),
                  from: fmt.money(prevMap.get(c.id) ?? 0, cur),
                  to: fmt.money(c.total, cur),
                })}
              </span>
            </li>
          ))}
          {changes.length === 0 && (
            <li className="text-muted-foreground">{t("analytics.stable")}</li>
          )}
        </ul>
      </Card>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Flame;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card className="flex items-start gap-3">
      <span className="bg-primary/12 text-primary inline-flex size-10 shrink-0 items-center justify-center rounded-full">
        <Icon className="size-5" />
      </span>
      <div className="min-w-0">
        <Overline>{label}</Overline>
        <p className="num mt-1 truncate text-2xl font-bold">{value}</p>
        <p className="text-muted-foreground truncate text-[13px] first-letter:uppercase">{hint}</p>
      </div>
    </Card>
  );
}
