import { notFound } from "next/navigation";
import { ArrowDownRight, ArrowUpRight, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, Overline } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CategoryIcon } from "@/components/ui/category-icon";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { CATEGORY_COLORS, DEFAULT_CATEGORIES } from "@/lib/design/category-palette";
import { DialogDemo } from "./dialog-demo";

export const metadata = { title: "UI-витрина" };

/** Витрина дизайн-системы (tasks.md 2.7). Доступна только в режиме разработки. */
export default function UiShowcasePage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="mx-auto flex max-w-[1280px] flex-col gap-5 px-4 py-8 sm:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Overline>Дизайн-система</Overline>
          <h1 className="text-[28px] leading-9 font-bold">Salary · UI-витрина</h1>
        </div>
        <ThemeToggle />
      </header>

      <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Баланс" value="124 350 ₽" delta="+8%" up />
        <Kpi label="Доход за месяц" value="185 000 ₽" delta="+12%" up tone="income" />
        <Kpi label="Расход за месяц" value="−60 650 ₽" delta="+4%" up tone="expense" />
        <Kpi label="Норма сбережений" value="67%" delta="−3 п.п." />
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Кнопки</CardTitle>
          </CardHeader>
          <div className="flex flex-wrap gap-3">
            <Button>
              <Plus /> Добавить
            </Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">
              <Trash2 /> Удалить
            </Button>
            <Button variant="link">Ссылка</Button>
            <Button size="icon" aria-label="Добавить">
              <Plus />
            </Button>
            <Button disabled>Disabled</Button>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Поля ввода</CardTitle>
          </CardHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="d-email">Email</Label>
              <Input id="d-email" type="email" placeholder="you@example.com" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="d-err">С ошибкой</Label>
              <Input id="d-err" aria-invalid defaultValue="12,5,0" />
              <p className="text-expense text-[13px]">Введите корректную сумму</p>
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="d-sum">Сумма</Label>
              <Input
                id="d-sum"
                inputMode="decimal"
                defaultValue="12 500"
                className="num h-14 text-[28px] font-semibold"
              />
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Вкладки и диалог</CardTitle>
          </CardHeader>
          <div className="flex flex-wrap items-center gap-4">
            <Tabs defaultValue="expense">
              <TabsList>
                <TabsTrigger value="expense">Расходы</TabsTrigger>
                <TabsTrigger value="income">Доходы</TabsTrigger>
              </TabsList>
            </Tabs>
            <DialogDemo />
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Бюджеты</CardTitle>
          </CardHeader>
          <div className="grid gap-4">
            <BudgetRow label="Продукты" pct={54} tone="primary" />
            <BudgetRow label="Кафе" pct={86} tone="warning" />
            <BudgetRow label="Развлечения" pct={112} tone="expense" />
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Категории по умолчанию</CardTitle>
          </CardHeader>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {DEFAULT_CATEGORIES.map((c) => (
              <li key={c.key} className="flex items-center gap-3">
                <CategoryIcon icon={c.icon} color={c.color} />
                <span className="text-sm font-medium">{c.name}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Палитра и скелетоны</CardTitle>
          </CardHeader>
          <div className="mb-5 flex flex-wrap gap-2">
            {CATEGORY_COLORS.map((c) => (
              <span
                key={c}
                title={c}
                className="size-9 rounded-full"
                style={{ background: `var(--cat-${c})` }}
              />
            ))}
          </div>
          <div className="grid gap-3">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        </Card>
      </section>
    </main>
  );
}

function Kpi({
  label,
  value,
  delta,
  up,
  tone,
}: {
  label: string;
  value: string;
  delta: string;
  up?: boolean;
  tone?: "income" | "expense";
}) {
  const Arrow = up ? ArrowUpRight : ArrowDownRight;
  // Для расходов рост — плохо, для остального — хорошо
  const good = tone === "expense" ? !up : up;
  return (
    <Card className="transition-transform duration-150 hover:-translate-y-0.5">
      <Overline>{label}</Overline>
      <p className="num mt-2 text-[32px] leading-10 font-bold sm:text-[40px] sm:leading-[48px]">
        {value}
      </p>
      <p
        className={`mt-1 inline-flex items-center gap-1 text-[13px] font-medium ${good ? "text-income" : "text-expense"}`}
      >
        <Arrow className="size-4" /> {delta} к прошлому месяцу
      </p>
    </Card>
  );
}

function BudgetRow({
  label,
  pct,
  tone,
}: {
  label: string;
  pct: number;
  tone: "primary" | "warning" | "expense";
}) {
  return (
    <div className="grid gap-1.5">
      <div className="flex justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="num text-muted-foreground">{pct}%</span>
      </div>
      <Progress value={pct} tone={tone} aria-label={`${label}: ${pct}%`} />
    </div>
  );
}
