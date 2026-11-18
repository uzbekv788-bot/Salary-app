import Link from "next/link";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { CategoryIcon } from "@/components/ui/category-icon";
import { categoryColorVar } from "@/lib/design/category-palette";
import { shortDate } from "@/lib/format-date";
import { formatMoney } from "@/lib/money";
import { upcomingOccurrences } from "@/lib/recurring";
import type { GoalDTO, RecurringDTO } from "@/lib/queries/planning";

export function UpcomingCard({
  rules,
  today,
  currency,
}: {
  rules: RecurringDTO[];
  today: string;
  currency: string;
}) {
  const items = upcomingOccurrences(rules, today).slice(0, 5);
  if (!items.length) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ближайшие платежи</CardTitle>
        <Link href="/recurring" className="text-primary text-sm font-semibold hover:underline">
          Все
        </Link>
      </CardHeader>
      <ul className="grid gap-3">
        {items.map(({ rule: r, date }) => (
          <li key={`${r.id}-${date}`} className="flex items-center gap-2.5 text-sm">
            <CategoryIcon icon={r.category.icon} color={r.category.color} size="sm" />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{r.note || r.category.name}</span>
              <span className="text-muted-foreground block text-[13px]">
                {date === today ? "сегодня" : shortDate(date)}
              </span>
            </span>
            <span className={`num font-semibold ${r.type === "INCOME" ? "text-income" : ""}`}>
              {formatMoney(r.type === "INCOME" ? r.amount : -r.amount, currency, { signed: true })}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function GoalsCard({ goals, currency }: { goals: GoalDTO[]; currency: string }) {
  const active = goals.filter((g) => !g.completedAt).slice(0, 3);
  if (!active.length) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Цели</CardTitle>
        <Link href="/goals" className="text-primary text-sm font-semibold hover:underline">
          Все
        </Link>
      </CardHeader>
      <ul className="grid gap-4">
        {active.map((g) => {
          const pct = Math.min(1, g.saved / g.target);
          return (
            <li key={g.id} className="grid gap-1.5">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate font-medium">{g.name}</span>
                <span className="num text-muted-foreground">
                  {Math.floor(pct * 100)}% · {formatMoney(g.target - g.saved, currency)} осталось
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
