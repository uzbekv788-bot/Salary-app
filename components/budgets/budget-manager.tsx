"use client";

import { useState, useTransition } from "react";
import Link from "@/components/i18n/link";
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
import { rich } from "@/components/i18n/rich";
import type { BudgetProgress } from "@/lib/queries/analytics";
import type { CategoryDTO } from "@/lib/queries/finance";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n/locale-provider";
import { useDesktopAutoFocus } from "@/lib/hooks/use-desktop-autofocus";

const STATUS = {
  ok: { tone: "primary", icon: CircleCheck, text: "budget.ok", cls: "text-income" },
  warning: { tone: "warning", icon: TriangleAlert, text: "budget.warning", cls: "text-warning" },
  over: { tone: "expense", icon: OctagonAlert, text: "budget.over", cls: "text-expense" },
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
  const { t, fmt } = useI18n();
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
          <Link
            href={`?month=${props.prevMonth}`}
            aria-label={t("budget.prevMonth")}
            className={arrow}
          >
            <ChevronLeft className="size-5" />
          </Link>
          <span className="px-2 text-sm font-semibold">{props.monthLabel}</span>
          {props.nextMonth ? (
            <Link
              href={`?month=${props.nextMonth}`}
              aria-label={t("budget.nextMonth")}
              className={arrow}
            >
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
                  if (!r.ok) toast.error(t.dyn(r.error));
                  else if (r.data.copied) toast.success(t("budget.copied", { n: r.data.copied }));
                  else toast(t("budget.nothingToCopy"));
                })
              }
            >
              <Copy /> {t("budget.copyPrev")}
            </Button>
          )}
          <Button
            disabled={free.length === 0}
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus /> {t("budget.new")}
          </Button>
        </div>
      </div>

      {budgets.length === 0 ? (
        <Card>
          <EmptyState
            icon={PiggyBank}
            title={t("budget.empty")}
            description={t("budget.emptyText")}
          />
        </Card>
      ) : (
        <>
          <Card className="mb-5">
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-semibold">{t("budget.total")}</span>
              <span className="num text-muted-foreground text-sm">
                {rich(t("budget.ofAmount"), {
                  spent: <b className="text-foreground">{fmt.money(totalSpent, currency)}</b>,
                  limit: fmt.money(totalLimit, currency),
                })}
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
              aria-label={t("budget.total")}
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
                          <s.icon className="size-3.5" aria-hidden /> {t(s.text)}
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
                        {t("common.edit")}
                      </Button>
                    </div>
                    <Progress
                      value={b.pct * 100}
                      tone={s.tone}
                      aria-label={t("budget.ariaPct", {
                        name: b.name,
                        pct: Math.round(b.pct * 100),
                      })}
                    />
                    <div className="flex flex-wrap justify-between gap-2 text-sm">
                      <span className="num">
                        <b>{fmt.money(b.spent, currency)}</b>{" "}
                        <span className="text-muted-foreground">
                          {t("budget.ofLimit", {
                            limit: fmt.money(b.limit, currency),
                            pct: Math.round(b.pct * 100),
                          })}
                        </span>
                      </span>
                      <span
                        className={cn("num", left < 0 ? "text-expense" : "text-muted-foreground")}
                      >
                        {left >= 0
                          ? props.daysLeft
                            ? t("budget.leftDays", {
                                amount: fmt.money(left, currency),
                                n: props.daysLeft,
                              })
                            : t("budget.left", { amount: fmt.money(left, currency) })
                          : t("budget.overspent", { amount: fmt.money(-left, currency) })}
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
        title={editing ? t("budget.titleNamed", { name: editing.name }) : t("budget.new")}
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
  const { t } = useI18n();
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
          toast.success(t("budget.saved"));
          onDone();
        });
      }}
    >
      {!editing && (
        <div className="grid gap-1.5">
          <Label htmlFor="b-cat">{t("budget.expenseCategory")}</Label>
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
        <Label htmlFor="b-limit">{t("budget.limit")}</Label>
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
        {errors.limit && <p className="text-expense text-[13px]">{t.dyn(errors.limit)}</p>}
      </div>
      {errors.form && (
        <p role="alert" className="bg-expense/10 text-expense rounded-sm px-3 py-2 text-sm">
          {t.dyn(errors.form)}
        </p>
      )}
      <div className="flex gap-2">
        {editing && (
          <Button
            type="button"
            variant="secondary"
            size="icon"
            aria-label={t("budget.deleteAria")}
            className="text-expense"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const r = await deleteBudget(editing.id);
                if (r.ok) {
                  toast.success(t("budget.deleted"));
                  onDone();
                } else toast.error(t.dyn(r.error));
              })
            }
          >
            <Trash2 />
          </Button>
        )}
        <Button type="submit" className="flex-1" disabled={pending || !categoryId}>
          {pending ? t("common.saving") : t("common.save")}
        </Button>
      </div>
    </form>
  );
}
