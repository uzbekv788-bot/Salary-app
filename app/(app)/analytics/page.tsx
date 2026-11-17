import { Suspense } from "react";
import Link from "next/link";
import { CalendarDays, Flame, Lightbulb, TrendingDown, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { UrlSegmented } from "@/components/analytics/analytics-controls";
import { MonthBars } from "@/components/charts/month-bars";
import { Card, CardHeader, CardTitle, Overline } from "@/components/ui/card";
import { CategoryIcon } from "@/components/ui/category-icon";
import { categoryColorVar } from "@/lib/design/category-palette";
import { dayLabel } from "@/lib/format-date";
import { formatMoney, formatPercent, percentChange } from "@/lib/money";
import { getPeriod } from "@/lib/period-server";
import { getByCategory, getDailyStats, getKpis, getMonthComparison } from "@/lib/queries/analytics";

export const metadata = { title: "Аналитика" };

export default function AnalyticsPage({ searchParams }: PageProps<"/analytics">) {
  return (
    <>
      <PageHeader title="Аналитика" searchParams={searchParams} />
      <Suspense fallback={<PageSkeleton />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Content({
  searchParams,
}: {
  searchParams: PageProps<"/analytics">["searchParams"];
}) {
  const { user, params, period, today } = await getPeriod(searchParams);
  const type = params.type === "INCOME" ? "INCOME" : "EXPENSE";
  const months = params.months === "12" ? 12 : 6;
  const cur = user.currency;
  const endOfRange = period.to < today ? period.to : today;

  const [kpis, byCat, prevByCat, monthly, daily] = await Promise.all([
    getKpis(user.id, period),
    getByCategory(user.id, period, type, 100),
    getByCategory(user.id, { from: period.prevFrom, to: period.prevTo }, type, 100),
    getMonthComparison(user.id, endOfRange, months),
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
    `Доходы и расходы за последние ${months} мес. ` +
    monthly
      .map((m) => `${m.label}: +${formatMoney(m.income, cur)} / −${formatMoney(m.expense, cur)}`)
      .join("; ");

  return (
    <div className="grid gap-3 sm:gap-5">
      <section aria-label="Сводка" className="grid gap-3 sm:grid-cols-3 sm:gap-5">
        <Stat
          icon={CalendarDays}
          label="Средний расход в день"
          value={formatMoney(Math.round(avgPerDay), cur)}
          hint={daily.elapsedDays ? `за ${daily.elapsedDays} дн.` : "период ещё не начался"}
        />
        <Stat
          icon={Flame}
          label="Самый дорогой день"
          value={daily.maxDay ? formatMoney(daily.maxDay.total, cur) : "—"}
          hint={daily.maxDay ? dayLabel(daily.maxDay.date, today) : "нет расходов"}
        />
        <Stat
          icon={TrendingUp}
          label="Лучший месяц"
          value={best ? formatMoney(best.income - best.expense, cur, { signed: true }) : "—"}
          hint={best ? `${best.label} · из последних ${months}` : ""}
        />
      </section>

      <div className="grid gap-3 sm:gap-5 xl:grid-cols-12">
        <Card className="xl:col-span-7">
          <CardHeader className="flex-wrap">
            <CardTitle>Месяц к месяцу</CardTitle>
            <UrlSegmented
              param="months"
              label="Сколько месяцев"
              fallback="6"
              options={[
                { value: "6", label: "6 мес" },
                { value: "12", label: "12 мес" },
              ]}
            />
          </CardHeader>
          <MonthBars data={monthly} currency={cur} summary={barsSummary} />
        </Card>

        <Card className="xl:col-span-5">
          <CardHeader className="flex-wrap">
            <CardTitle>Топ категорий</CardTitle>
            <UrlSegmented
              param="type"
              label="Тип"
              fallback="EXPENSE"
              options={[
                { value: "EXPENSE", label: "Расходы", activeClass: "bg-expense text-white" },
                {
                  value: "INCOME",
                  label: "Доходы",
                  activeClass: "bg-income text-white dark:text-primary-foreground",
                },
              ]}
            />
          </CardHeader>
          <p className="text-muted-foreground mb-4 text-sm">
            {period.label} · всего{" "}
            <span className="num text-foreground font-semibold">
              {formatMoney(byCat.total, cur)}
            </span>
          </p>
          {byCat.all.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              Нет {isExpense ? "расходов" : "доходов"} за период
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
                      {formatMoney(c.total, cur)}
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
                      {formatPercent(c.share)}
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
            <Lightbulb className="text-warning size-5" /> Выводы
          </CardTitle>
        </CardHeader>
        <ul className="grid gap-2 text-[15px]">
          <li>
            За{" "}
            {period.label.toLowerCase().startsWith("2")
              ? `${period.label} год`
              : period.label.toLowerCase()}{" "}
            вы {kpis.income >= kpis.expense ? "сохранили" : "потратили больше, чем заработали, на"}{" "}
            <b className="num">{formatMoney(Math.abs(kpis.income - kpis.expense), cur)}</b>
            {kpis.income > 0 && kpis.income >= kpis.expense && (
              <> — это {formatPercent((kpis.income - kpis.expense) / kpis.income)} дохода</>
            )}
            .
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
                {isExpense ? "Траты" : "Доход"} в категории «{c.name}»{" "}
                <b className={isExpense === c.change! > 0 ? "text-expense" : "text-income"}>
                  {formatPercent(c.change!, { signed: true })}
                </b>{" "}
                к прошлому периоду ({formatMoney(prevMap.get(c.id) ?? 0, cur)} →{" "}
                {formatMoney(c.total, cur)}).
              </span>
            </li>
          ))}
          {changes.length === 0 && (
            <li className="text-muted-foreground">
              Заметных изменений по категориям нет — расходы стабильны.
            </li>
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
