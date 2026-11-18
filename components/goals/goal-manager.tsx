"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  CalendarClock,
  MoreHorizontal,
  Pencil,
  Plus,
  PartyPopper,
  Target,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CategoryIcon } from "@/components/ui/category-icon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveSheet } from "@/components/ui/responsive-sheet";
import { Segmented } from "@/components/ui/segmented";
import { addContribution, deleteGoal, saveGoal } from "@/lib/actions/planning";
import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  categoryColorVar,
  type CategoryColor,
} from "@/lib/design/category-palette";
import { dateWithYear, shortDate } from "@/lib/format-date";
import { formatAmountInput, minorToInput } from "@/lib/format-input";
import { monthlyNeeded } from "@/lib/goals";
import { formatMoney } from "@/lib/money";
import type { GoalDTO } from "@/lib/queries/planning";
import { useDesktopAutoFocus } from "@/lib/hooks/use-desktop-autofocus";
import { cn } from "@/lib/utils";

const GOAL_ICONS = [
  "Plane",
  "Umbrella",
  "Laptop",
  "Car",
  "Home",
  "GraduationCap",
  "Heart",
  "Gift",
  "PiggyBank",
  "Smartphone",
  "Bike",
  "Trophy",
];

/** Цели накоплений (tasks.md 16). Накоплено = сумма пополнений минус снятия. */
export function GoalManager({
  goals,
  today,
  currency,
}: {
  goals: GoalDTO[];
  today: string;
  currency: string;
}) {
  const [form, setForm] = useState<{ open: boolean; goal: GoalDTO | null }>({
    open: false,
    goal: null,
  });
  const [money, setMoney] = useState<GoalDTO | null>(null);
  const [pending, startTransition] = useTransition();
  const active = goals.filter((g) => !g.completedAt);
  const done = goals.filter((g) => g.completedAt);

  const card = (g: GoalDTO) => {
    const pct = Math.min(1, g.saved / g.target);
    const need = monthlyNeeded(g.target, g.saved, g.deadline, today);
    const overdue = g.deadline && g.deadline < today && !g.completedAt;
    return (
      <li key={g.id}>
        <Card className="grid gap-3">
          <div className="flex items-center gap-3">
            <CategoryIcon icon={g.icon} color={g.color} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{g.name}</p>
              <p
                className={cn(
                  "inline-flex items-center gap-1 text-[13px]",
                  overdue ? "text-expense" : "text-muted-foreground",
                )}
              >
                {g.completedAt ? (
                  <>
                    <PartyPopper className="size-3.5" aria-hidden /> Цель достигнута
                  </>
                ) : g.deadline ? (
                  <>
                    <CalendarClock className="size-3.5" aria-hidden />{" "}
                    {overdue ? "Срок прошёл" : "до"} {dateWithYear(g.deadline, today)}
                  </>
                ) : (
                  "Без срока"
                )}
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label={`Действия: ${g.name}`}>
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setForm({ open: true, goal: g })}>
                  <Pencil /> Изменить
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-expense"
                  disabled={pending}
                  onSelect={() =>
                    startTransition(async () => {
                      const r = await deleteGoal(g.id);
                      if (r.ok) toast.success("Цель удалена");
                      else toast.error(r.error);
                    })
                  }
                >
                  <Trash2 className="!text-expense" /> Удалить
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div
            className="bg-foreground/8 h-2.5 overflow-hidden rounded-full"
            role="progressbar"
            aria-valuenow={Math.round(pct * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${g.name}: ${Math.round(pct * 100)}%`}
          >
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{ width: `${Math.max(pct * 100, 1)}%`, background: categoryColorVar(g.color) }}
            />
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
            <span className="num">
              <b>{formatMoney(g.saved, currency)}</b>{" "}
              <span className="text-muted-foreground">
                из {formatMoney(g.target, currency)} · {Math.floor(pct * 100)}%
              </span>
            </span>
            {need && (
              <span className="num text-muted-foreground">
                ≈ {formatMoney(need.perMonth, currency)} в месяц
              </span>
            )}
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="justify-self-start"
            onClick={() => setMoney(g)}
          >
            <Plus /> Пополнить / снять
          </Button>
        </Card>
      </li>
    );
  };

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground max-w-xl text-sm">
          Откладывайте на большие покупки и подушку безопасности — Salary подскажет, сколько нужно в
          месяц.
        </p>
        <Button onClick={() => setForm({ open: true, goal: null })}>
          <Plus /> Новая цель
        </Button>
      </div>

      {goals.length === 0 ? (
        <Card>
          <EmptyState
            icon={Target}
            title="Целей пока нет"
            description="Например: «Отпуск — 150 000 ₽ к июню». Пополняйте понемногу и следите за прогрессом."
          />
        </Card>
      ) : (
        <div className="grid gap-5">
          {active.length > 0 && (
            <ul className="grid gap-3 sm:gap-5 md:grid-cols-2">{active.map(card)}</ul>
          )}
          {done.length > 0 && (
            <section>
              <h2 className="text-muted-foreground mb-2 text-sm font-semibold">
                Достигнутые ({done.length})
              </h2>
              <ul className="grid gap-3 sm:gap-5 md:grid-cols-2">{done.map(card)}</ul>
            </section>
          )}
        </div>
      )}

      <ResponsiveSheet
        open={form.open}
        onOpenChange={(open) => setForm((f) => ({ ...f, open }))}
        title={form.goal ? "Изменить цель" : "Новая цель"}
      >
        <GoalForm
          key={`${form.goal?.id ?? "new"}-${form.open}`}
          initial={form.goal}
          onDone={() => setForm({ open: false, goal: null })}
        />
      </ResponsiveSheet>
      <ResponsiveSheet
        open={Boolean(money)}
        onOpenChange={(o) => !o && setMoney(null)}
        title={money ? money.name : ""}
        description={
          money
            ? `Накоплено ${formatMoney(money.saved, currency)} из ${formatMoney(money.target, currency)}`
            : undefined
        }
      >
        {money && (
          <ContributionForm
            goal={money}
            today={today}
            currency={currency}
            onDone={() => setMoney(null)}
          />
        )}
      </ResponsiveSheet>
    </>
  );
}

function GoalForm({ initial, onDone }: { initial: GoalDTO | null; onDone: () => void }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [target, setTarget] = useState(initial ? minorToInput(initial.target) : "");
  const [deadline, setDeadline] = useState(initial?.deadline ?? "");
  const [icon, setIcon] = useState(initial?.icon ?? "Plane");
  const [color, setColor] = useState<CategoryColor>((initial?.color as CategoryColor) ?? "sky");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const focusRef = useDesktopAutoFocus<HTMLInputElement>();
  return (
    <form
      noValidate
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const r = await saveGoal({ name, target, deadline, icon, color }, initial?.id);
          if (!r.ok) {
            setErrors(r.fieldErrors ?? { form: r.error });
            return;
          }
          toast.success(initial ? "Цель изменена" : "Цель создана");
          onDone();
        });
      }}
    >
      <div className="grid gap-1.5">
        <Label htmlFor="g-name">Название</Label>
        <Input
          id="g-name"
          ref={focusRef}
          value={name}
          maxLength={40}
          placeholder="Отпуск"
          onChange={(e) => setName(e.target.value)}
          aria-invalid={Boolean(errors.name)}
        />
        {errors.name && <p className="text-expense text-[13px]">{errors.name}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="g-target">Сколько нужно</Label>
          <Input
            id="g-target"
            inputMode="decimal"
            placeholder="150 000"
            value={target}
            onChange={(e) => setTarget(formatAmountInput(e.target.value))}
            className="num"
            aria-invalid={Boolean(errors.target)}
          />
          {errors.target && <p className="text-expense text-[13px]">{errors.target}</p>}
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="g-deadline">К какой дате</Label>
          <Input
            id="g-deadline"
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
        </div>
      </div>
      <fieldset>
        <legend className="text-muted-foreground mb-2 text-[13px] font-medium">
          Иконка и цвет
        </legend>
        <div role="radiogroup" aria-label="Иконка" className="mb-3 flex flex-wrap gap-1">
          {GOAL_ICONS.filter((i) => i in CATEGORY_ICONS).map((i) => (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={icon === i}
              aria-label={i}
              onClick={() => setIcon(i)}
              className={cn(
                "focus-visible:ring-ring rounded-md p-1 outline-none focus-visible:ring-2",
                icon === i ? "bg-primary/12 ring-primary ring-2" : "hover:bg-foreground/5",
              )}
            >
              <CategoryIcon icon={i} color={icon === i ? color : "slate"} size="sm" />
            </button>
          ))}
        </div>
        <div role="radiogroup" aria-label="Цвет" className="flex flex-wrap gap-2">
          {CATEGORY_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={color === c}
              aria-label={c}
              onClick={() => setColor(c)}
              className={cn(
                "focus-visible:ring-ring size-8 rounded-full outline-none focus-visible:ring-2",
                color === c && "ring-foreground ring-offset-background ring-2 ring-offset-2",
              )}
              style={{ background: categoryColorVar(c) }}
            />
          ))}
        </div>
      </fieldset>
      {errors.form && (
        <p role="alert" className="bg-expense/10 text-expense rounded-sm px-3 py-2 text-sm">
          {errors.form}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Сохраняем…" : initial ? "Сохранить" : "Создать цель"}
      </Button>
    </form>
  );
}

function ContributionForm({
  goal,
  today,
  currency,
  onDone,
}: {
  goal: GoalDTO;
  today: string;
  currency: string;
  onDone: () => void;
}) {
  const [direction, setDirection] = useState<"IN" | "OUT">("IN");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const focusRef = useDesktopAutoFocus<HTMLInputElement>();
  return (
    <div className="grid gap-4">
      <form
        noValidate
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(async () => {
            const r = await addContribution({ goalId: goal.id, direction, amount, date });
            if (!r.ok) {
              setErrors(r.fieldErrors ?? { form: r.error });
              return;
            }
            if (r.data.justCompleted)
              toast.success(`Цель «${goal.name}» достигнута! 🎉`, { duration: 8000 });
            else toast.success(direction === "IN" ? "Отложено" : "Снято с цели");
            onDone();
          });
        }}
      >
        <Segmented
          label="Действие"
          value={direction}
          onChange={setDirection}
          options={[
            { value: "IN", label: "Пополнить" },
            { value: "OUT", label: "Снять" },
          ]}
        />
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="c-amount">Сумма</Label>
            <Input
              id="c-amount"
              ref={focusRef}
              inputMode="decimal"
              placeholder="5 000"
              value={amount}
              onChange={(e) => setAmount(formatAmountInput(e.target.value))}
              className="num h-14 text-2xl font-bold"
              aria-invalid={Boolean(errors.amount)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="c-date">Дата</Label>
            <Input
              id="c-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-14"
            />
          </div>
        </div>
        {(errors.amount || errors.form) && (
          <p role="alert" className="text-expense text-[13px]">
            {errors.amount || errors.form}
          </p>
        )}
        <Button type="submit" disabled={pending}>
          {pending ? "Сохраняем…" : direction === "IN" ? "Отложить" : "Снять"}
        </Button>
      </form>
      {goal.contributions.length > 0 && (
        <div>
          <p className="text-muted-foreground mb-1.5 text-[13px] font-medium">Последние движения</p>
          <ul className="grid gap-1 text-sm">
            {goal.contributions.map((c) => (
              <li key={c.id} className="flex justify-between gap-3">
                <span className="text-muted-foreground">
                  {shortDate(c.date)}
                  {c.note && ` · ${c.note}`}
                </span>
                <span className="num font-semibold">
                  {formatMoney(c.amount, currency, { signed: true })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
