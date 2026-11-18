import Link from "@/components/i18n/link";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { CategoryIcon } from "@/components/ui/category-icon";
import { categoryColorVar } from "@/lib/design/category-palette";
import { getI18n } from "@/lib/i18n/server";
import { upcomingOccurrences } from "@/lib/recurring";
import type { GoalDTO, RecurringDTO } from "@/lib/queries/planning";

export async function UpcomingCard({
  rules,
  today,
  currency,
}: {
  rules: RecurringDTO[];
  today: string;
  currency: string;
}) {
  const { t, fmt } = await getI18n();
  const items = upcomingOccurrences(rules, today).slice(0, 5);
  if (!items.length) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("dash.upcoming")}</CardTitle>
        <Link href="/recurring" className="text-primary text-sm font-semibold hover:underline">
          {t("common.all")}
        </Link>
      </CardHeader>
      <ul className="grid gap-3">
        {items.map(({ rule: r, date }) => (
          <li key={`${r.id}-${date}`} className="flex items-center gap-2.5 text-sm">
            <CategoryIcon icon={r.category.icon} color={r.category.color} size="sm" />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{r.note || r.category.name}</span>
              <span className="text-muted-foreground block text-[13px]">
                {date === today ? t("common.today") : fmt.short(date)}
              </span>
            </span>
            <span className={`num font-semibold ${r.type === "INCOME" ? "text-income" : ""}`}>
              {fmt.money(r.type === "INCOME" ? r.amount : -r.amount, currency, { signed: true })}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export async function GoalsCard({ goals, currency }: { goals: GoalDTO[]; currency: string }) {
  const { t, fmt } = await getI18n();
  const active = goals.filter((g) => !g.completedAt).slice(0, 3);
  if (!active.length) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("dash.goals")}</CardTitle>
        <Link href="/goals" className="text-primary text-sm font-semibold hover:underline">
          {t("common.all")}
        </Link>
      </CardHeader>
      <ul className="grid gap-4">
        {active.map((g) => {
          const pct = Math.min(1, g.saved / g.target);
          return (
            <li key={g.id} className="grid min-w-0 gap-1.5">
              <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-sm">
                <span className="min-w-0 truncate font-medium">{g.name}</span>
                <span className="num text-muted-foreground shrink-0 whitespace-nowrap">
                  {t("dash.goalLeft", {
                    pct: Math.floor(pct * 100),
                    amount: fmt.money(g.target - g.saved, currency),
                  })}
                </span>
              </div>
              <div
                className="bg-foreground/8 h-2 overflow-hidden rounded-full"
                role="progressbar"
                aria-valuenow={Math.round(pct * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${g.name}: ${Math.round(pct * 100)}%`}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max(1, pct * 100)}%`,
                    background: categoryColorVar(g.color),
                  }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
