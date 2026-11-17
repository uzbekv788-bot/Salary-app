"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  PiggyBank,
  Plus,
  Trash2,
  TriangleAlert,
  CircleCheck,
  OctagonAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CategoryIcon } from "@/components/ui/category-icon";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Progress } from "@/components/ui/progress";
import { ResponsiveSheet } from "@/components/ui/responsive-sheet";
import { copyBudgetsFromPrevious, deleteBudget, upsertBudget } from "@/lib/actions/finance";
import { formatAmountInput, minorToInput } from "@/lib/format-input";
import { formatMoney } from "@/lib/money";
import type { BudgetProgress } from "@/lib/queries/analytics";
import type { CategoryDTO } from "@/lib/queries/finance";
import { cn } from "@/lib/utils";
import { useDesktopAutoFocus } from "@/lib/hooks/use-desktop-autofocus";

const STATUS = {
  ok: { tone: "primary", icon: CircleCheck, text: "В пределах лимита", cls: "text-income" },
  warning: { tone: "warning", icon: TriangleAlert, text: "Почти исчерпан", cls: "text-warning" },
  over: { tone: "expense", icon: OctagonAlert, text: "Превышен", cls: "text-expense" },
} as const;

/** Бюджеты месяца (tasks.md 11.2): прогресс, «осталось N на M дней», статус — иконка + текст, не только цвет. */
export function BudgetManager(props: {
  budgets: BudgetProgress[];
  categories: CategoryDTO[];
  month: string;
  monthLabel: string;
  daysLeft: number | null;
  prevMonth: string;
  nextMonth: string | null;
  currency: string;
}) {
  const { budgets, categories, month, currency } = props;
  const [editing, setEditing] = useState<BudgetProgress | null>(null);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const free = categories.filter(
    (c) => c.type === "EXPENSE" && !c.archived && !budgets.some((b) => b.categoryId === c.id),
  );
  const totalLimit = budgets.reduce((s, b) => s + b.limit, 0);
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);
  const arrow =
    "inline-flex size-9 items-center justify-center rounded-full outline-none hover:bg-foreground/6 focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="glass inline-flex h-11 items-center gap-1 rounded-full p-1">
          <Link href={`?month=${props.prevMonth}`} aria-label="Предыдущий месяц" className={arrow}>
            <ChevronLeft className="size-5" />
          </Link>
          <span className="px-2 text-sm font-semibold">{props.monthLabel}</span>
          {props.nextMonth ? (
            <Link href={`?month=${props.nextMonth}`} aria-label="Следующий месяц" className={arrow}>
              <ChevronRight className="size-5" />
            </Link>
          ) : (
            <span aria-hidden className={cn(arrow, "text-muted-foreground/40")}>
              <ChevronRight className="size-5" />
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {budgets.length === 0 && (
            <Button
              variant="secondary"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const r = await copyBudgetsFromPrevious(month);
                  if (!r.ok) toast.error(r.error);
                  else if (r.data.copied) toast.success(`Скопировано лимитов: ${r.data.copied}`);
                  else toast("В прошлом месяце бюджетов не было");
                })
              }
            >
              <Copy /> Как в прошлом месяце
            </Button>
          )}
          <Button
            disabled={free.length === 0}
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus /> Новый бюджет
          </Button>
        </div>
      </div>

      {budgets.length === 0 ? (
        <Card>
          <EmptyState
            icon={PiggyBank}
            title="Бюджетов пока нет"
            description="Задайте месячный лимит для категории — например, не больше 10 000 ₽ на кафе. Мы предупредим на 80% и при превышении."
          />
        </Card>
      ) : (
        <>
          <Card className="mb-5">
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-semibold">Всего по бюджетам</span>
              <span className="num text-muted-foreground text-sm">
                <b className="text-foreground">{formatMoney(totalSpent, currency)}</b> из{" "}
                {formatMoney(totalLimit, currency)}
              </span>
            </div>
            <Progress
              value={(totalSpent / totalLimit) * 100}
              tone={
                totalSpent > totalLimit
                  ? "expense"
                  : totalSpent >= totalLimit * 0.8
                    ? "warning"
                    : "primary"
              }
              aria-label="Всего по бюджетам"
            />
          </Card>
          <ul className="grid gap-3 sm:gap-5 md:grid-cols-2">
            {budgets.map((b) => {
              const s = STATUS[b.status];
              const left = b.limit - b.spent;
              return (
                <li key={b.id}>
                  <Card className="grid gap-3">
                    <div className="flex items-center gap-3">
                      <CategoryIcon icon={b.icon} color={b.color} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{b.name}</p>
                        <p
                          className={cn(
                            "inline-flex items-center gap-1 text-[13px] font-medium",
                            s.cls,
                          )}
                        >
                          <s.icon className="size-3.5" aria-hidden /> {s.text}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditing(b);
                          setOpen(true);
                        }}
                      >
                        Изменить
                      </Button>
                    </div>
                    <Progress
                      value={b.pct * 100}
                      tone={s.tone}
                      aria-label={`${b.name}: ${Math.round(b.pct * 100)}% лимита`}
                    />
                    <div className="flex flex-wrap justify-between gap-2 text-sm">
                      <span className="num">
                        <b>{formatMoney(b.spent, currency)}</b>{" "}
                        <span className="text-muted-foreground">
                          из {formatMoney(b.limit, currency)} · {Math.round(b.pct * 100)}%
                        </span>
                      </span>
                      <span
                        className={cn("num", left < 0 ? "text-expense" : "text-muted-foreground")}
                      >
                        {left >= 0
                          ? `Осталось ${formatMoney(left, currency)}${props.daysLeft ? ` на ${props.daysLeft} дн.` : ""}`
                          : `Перерасход ${formatMoney(-left, currency)}`}
                      </span>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <ResponsiveSheet
        open={open}
        onOpenChange={setOpen}
        title={editing ? `Бюджет «${editing.name}»` : "Новый бюджет"}
      >
        <BudgetForm
          key={`${editing?.id ?? "new"}-${open}`}
          editing={editing}
          free={free}
          month={month}
          onDone={() => setOpen(false)}
        />
      </ResponsiveSheet>
    </>
  );
}

function BudgetForm({
  editing,
  free,
  month,
  onDone,
}: {
  editing: BudgetProgress | null;
  free: CategoryDTO[];
  month: string;
  onDone: () => void;
}) {
  const [categoryId, setCategoryId] = useState(editing?.categoryId ?? free[0]?.id ?? "");
  const [limit, setLimit] = useState(editing ? minorToInput(editing.limit) : "");
  const focusRef = useDesktopAutoFocus<HTMLInputElement>();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  return (
    <form
      noValidate
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const r = await upsertBudget({ categoryId, month, limit });
          if (!r.ok) {
            setErrors(r.fieldErrors ?? { form: r.error });
            return;
          }
          toast.success("Бюджет сохранён");
          onDone();
        });
      }}
    >
      {!editing && (
        <div className="grid gap-1.5">
          <Label htmlFor="b-cat">Категория расходов</Label>
          <NativeSelect
            id="b-cat"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            {free.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </NativeSelect>
        </div>
      )}
      <div className="grid gap-1.5">
        <Label htmlFor="b-limit">Лимит на месяц</Label>
        <Input
          id="b-limit"
          inputMode="decimal"
          placeholder="10 000"
          value={limit}
          onChange={(e) => setLimit(formatAmountInput(e.target.value))}
          className="num h-14 text-2xl font-semibold"
          aria-invalid={Boolean(errors.limit)}
          ref={focusRef}
        />
        {errors.limit && <p className="text-expense text-[13px]">{errors.limit}</p>}
      </div>
      {errors.form && (
        <p role="alert" className="bg-expense/10 text-expense rounded-sm px-3 py-2 text-sm">
          {errors.form}
        </p>
      )}
      <div className="flex gap-2">
        {editing && (
          <Button
            type="button"
            variant="secondary"
            size="icon"
            aria-label="Удалить бюджет"
            className="text-expense"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const r = await deleteBudget(editing.id);
                if (r.ok) {
                  toast.success("Бюджет удалён");
                  onDone();
                } else toast.error(r.error);
              })
            }
          >
            <Trash2 />
          </Button>
        )}
        <Button type="submit" className="flex-1" disabled={pending || !categoryId}>
          {pending ? "Сохраняем…" : "Сохранить"}
        </Button>
      </div>
    </form>
  );
}
