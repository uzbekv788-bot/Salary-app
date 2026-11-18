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
import { useI18n } from "@/components/i18n/locale-provider";
import { formatAmountInput, minorToInput } from "@/lib/format-input";
import { monthlyNeeded } from "@/lib/goals";
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
  const { t, fmt } = useI18n();
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
                    <PartyPopper className="size-3.5" aria-hidden /> {t("goal.reached")}
                  </>
                ) : g.deadline ? (
                  <>
                    <CalendarClock className="size-3.5" aria-hidden />{" "}
                    {overdue
                      ? t("goal.overdue", { date: fmt.shortYear(g.deadline, today) })
                      : t("goal.until", { date: fmt.shortYear(g.deadline, today) })}
                  </>
                ) : (
                  t("goal.noDeadline")
                )}
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("cat.actions", { name: g.name })}
                >
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setForm({ open: true, goal: g })}>
                  <Pencil /> {t("common.edit")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-expense"
                  disabled={pending}
                  onSelect={() =>
                    startTransition(async () => {
                      const r = await deleteGoal(g.id);
                      if (r.ok) toast.success(t("goal.deleted"));
                      else toast.error(t.dyn(r.error));
                    })
                  }
                >
                  <Trash2 className="!text-expense" /> {t("common.delete")}
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
              <b>{fmt.money(g.saved, currency)}</b>{" "}
              <span className="text-muted-foreground">
                {t("goal.ofTarget", {
                  target: fmt.money(g.target, currency),
                  pct: Math.floor(pct * 100),
                })}
              </span>
            </span>
            {need && (
              <span className="num text-muted-foreground">
                {t("goal.perMonth", { amount: fmt.money(need.perMonth, currency) })}
              </span>
            )}
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="justify-self-start"
            onClick={() => setMoney(g)}
          >
            <Plus /> {t("goal.addOrWithdraw")}
          </Button>
        </Card>
      </li>
    );
  };

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground max-w-xl text-sm">{t("goal.lead")}</p>
        <Button onClick={() => setForm({ open: true, goal: null })}>
          <Plus /> {t("goal.new")}
        </Button>
      </div>

      {goals.length === 0 ? (
        <Card>
          <EmptyState icon={Target} title={t("goal.empty")} description={t("goal.emptyText")} />
        </Card>
      ) : (
        <div className="grid gap-5">
          {active.length > 0 && (
            <ul className="grid gap-3 sm:gap-5 md:grid-cols-2">{active.map(card)}</ul>
          )}
          {done.length > 0 && (
            <section>
              <h2 className="text-muted-foreground mb-2 text-sm font-semibold">
                {t("goal.done", { n: done.length })}
              </h2>
              <ul className="grid gap-3 sm:gap-5 md:grid-cols-2">{done.map(card)}</ul>
            </section>
          )}
        </div>
      )}

      <ResponsiveSheet
        open={form.open}
        onOpenChange={(open) => setForm((f) => ({ ...f, open }))}
        title={form.goal ? t("goal.editTitle") : t("goal.new")}
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
            ? t("goal.savedOf", {
                saved: fmt.money(money.saved, currency),
                target: fmt.money(money.target, currency),
              })
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
  const { t } = useI18n();
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
          toast.success(initial ? t("goal.edited") : t("goal.created"));
          onDone();
        });
      }}
    >
      <div className="grid gap-1.5">
        <Label htmlFor="g-name">{t("common.name")}</Label>
        <Input
          id="g-name"
          ref={focusRef}
          value={name}
          maxLength={40}
          placeholder={t("goal.namePlaceholder")}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={Boolean(errors.name)}
        />
        {errors.name && <p className="text-expense text-[13px]">{t.dyn(errors.name)}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="g-target">{t("goal.target")}</Label>
          <Input
            id="g-target"
            inputMode="decimal"
            placeholder="150 000"
            value={target}
            onChange={(e) => setTarget(formatAmountInput(e.target.value))}
            className="num"
            aria-invalid={Boolean(errors.target)}
          />
          {errors.target && <p className="text-expense text-[13px]">{t.dyn(errors.target)}</p>}
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="g-deadline">{t("goal.deadline")}</Label>
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
          {t("goal.iconColor")}
        </legend>
        <div role="radiogroup" aria-label={t("cat.icon")} className="mb-3 flex flex-wrap gap-1">
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
        <div role="radiogroup" aria-label={t("cat.color")} className="flex flex-wrap gap-2">
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
          {t.dyn(errors.form)}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? t("common.saving") : initial ? t("common.save") : t("goal.createGoal")}
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
  const { t, fmt } = useI18n();
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
              toast.success(t("goal.congrats", { name: goal.name }), { duration: 8000 });
            else toast.success(direction === "IN" ? t("goal.putAside") : t("goal.withdrawn"));
            onDone();
          });
        }}
      >
        <Segmented
          label={t("goal.action")}
          value={direction}
          onChange={setDirection}
          options={[
            { value: "IN", label: t("goal.deposit") },
            { value: "OUT", label: t("goal.withdraw") },
          ]}
        />
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="c-amount">{t("common.amount")}</Label>
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
            <Label htmlFor="c-date">{t("common.date")}</Label>
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
            {t.dyn(errors.amount || errors.form)}
          </p>
        )}
        <Button type="submit" disabled={pending}>
          {pending ? t("common.saving") : direction === "IN" ? t("goal.save") : t("goal.withdraw")}
        </Button>
      </form>
      {goal.contributions.length > 0 && (
        <div>
          <p className="text-muted-foreground mb-1.5 text-[13px] font-medium">
            {t("goal.history")}
          </p>
          <ul className="grid gap-1 text-sm">
            {goal.contributions.map((c) => (
              <li key={c.id} className="flex justify-between gap-3">
                <span className="text-muted-foreground">
                  {fmt.short(c.date)}
                  {c.note && ` · ${c.note}`}
                </span>
                <span className="num font-semibold">
                  {fmt.money(c.amount, currency, { signed: true })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
