"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { MoreHorizontal, Pause, Pencil, Play, Plus, Repeat, Trash2 } from "lucide-react";
import { differenceInCalendarDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, Overline } from "@/components/ui/card";
import { CategoryIcon } from "@/components/ui/category-icon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { ResponsiveSheet } from "@/components/ui/responsive-sheet";
import { RecurringForm } from "@/components/recurring/recurring-form";
import { deleteRecurring, setRecurringActive } from "@/lib/actions/planning";
import { dateWithYear } from "@/lib/format-date";
import { formatMoney } from "@/lib/money";
import { parseDate } from "@/lib/period";
import { describeSchedule, monthlyEquivalent } from "@/lib/recurring";
import type { CategoryDTO, WalletDTO } from "@/lib/queries/finance";
import type { RecurringDTO } from "@/lib/queries/planning";
import { cn } from "@/lib/utils";

function whenLabel(date: string, today: string) {
  const d = differenceInCalendarDays(parseDate(date)!, parseDate(today)!);
  if (d <= 0) return "сегодня";
  if (d === 1) return "завтра";
  if (d < 7) return `через ${d} дн.`;
  return dateWithYear(date, today);
}

/** Страница регулярных платежей (tasks.md 15.3). */
export function RecurringManager({
  rules,
  categories,
  wallets,
  today,
  currency,
}: {
  rules: RecurringDTO[];
  categories: CategoryDTO[];
  wallets: WalletDTO[];
  today: string;
  currency: string;
}) {
  const [editing, setEditing] = useState<RecurringDTO | null>(null);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const active = rules.filter((r) => r.active);
  const paused = rules.filter((r) => !r.active);
  const perMonth = (type: string) =>
    active
      .filter((r) => r.type === type)
      .reduce((s, r) => s + monthlyEquivalent(r.amount, r.frequency, r.interval), 0);
  const income = perMonth("INCOME");
  const expense = perMonth("EXPENSE");

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, msg: string) =>
    startTransition(async () => {
      const r = await fn();
      if (r.ok) toast.success(msg);
      else toast.error(r.error);
    });

  const row = (r: RecurringDTO) => (
    <li
      key={r.id}
      className={cn("flex items-center gap-3 rounded-md px-2 py-2.5", !r.active && "opacity-60")}
    >
      <CategoryIcon icon={r.category.icon} color={r.category.color} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{r.note || r.category.name}</p>
        <p className="text-muted-foreground truncate text-[13px]">
          {describeSchedule(r.startDate, r.frequency, r.interval)} · {r.wallet.name}
        </p>
      </div>
      <div className="text-right">
        <p
          className={cn("num font-semibold", r.type === "INCOME" ? "text-income" : "text-expense")}
        >
          {formatMoney(r.type === "INCOME" ? r.amount : -r.amount, currency, { signed: true })}
        </p>
        <p className="text-muted-foreground text-[13px]">
          {r.active
            ? whenLabel(r.nextDate, today)
            : r.endDate && r.nextDate > r.endDate
              ? "завершён"
              : "на паузе"}
        </p>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Действия: ${r.note || r.category.name}`}
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onSelect={() => {
              setEditing(r);
              setOpen(true);
            }}
          >
            <Pencil /> Изменить
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={pending}
            onSelect={() =>
              run(
                () => setRecurringActive(r.id, !r.active),
                r.active ? "Поставлено на паузу" : "Возобновлено",
              )
            }
          >
            {r.active ? (
              <>
                <Pause /> Пауза
              </>
            ) : (
              <>
                <Play /> Возобновить
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-expense"
            disabled={pending}
            onSelect={() =>
              run(() => deleteRecurring(r.id), "Удалено. Созданные операции остались в истории")
            }
          >
            <Trash2 className="!text-expense" /> Удалить
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground max-w-xl text-sm">
          Зарплата, аренда, подписки — операции появятся сами в нужный день.
        </p>
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus /> Новый платёж
        </Button>
      </div>

      {rules.length === 0 ? (
        <Card>
          <EmptyState
            icon={Repeat}
            title="Регулярных платежей пока нет"
            description="Добавьте зарплату или подписку один раз — дальше Salary будет записывать их автоматически."
          />
        </Card>
      ) : (
        <div className="grid gap-5">
          <div className="grid grid-cols-2 gap-3 sm:gap-5">
            <Card>
              <Overline>Приходит в месяц</Overline>
              <p className="num text-income mt-1 text-xl font-bold sm:text-2xl">
                {formatMoney(income, currency)}
              </p>
            </Card>
            <Card>
              <Overline>Уходит в месяц</Overline>
              <p className="num text-expense mt-1 text-xl font-bold sm:text-2xl">
                {formatMoney(-expense, currency)}
              </p>
            </Card>
          </div>
          {active.length > 0 && (
            <Card className="p-2 sm:p-3">
              <ul>{active.map(row)}</ul>
            </Card>
          )}
          {paused.length > 0 && (
            <section>
              <h2 className="text-muted-foreground mb-2 text-sm font-semibold">
                На паузе и завершённые ({paused.length})
              </h2>
              <Card className="p-2 sm:p-3">
                <ul>{paused.map(row)}</ul>
              </Card>
            </section>
          )}
        </div>
      )}

      <ResponsiveSheet
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Изменить регулярный платёж" : "Новый регулярный платёж"}
        description={editing ? "Изменения действуют на будущие повторения" : undefined}
      >
        <RecurringForm
          key={`${editing?.id ?? "new"}-${open}`}
          categories={categories}
          wallets={wallets}
          today={today}
          initial={editing}
          onDone={() => setOpen(false)}
        />
      </ResponsiveSheet>
    </>
  );
}
