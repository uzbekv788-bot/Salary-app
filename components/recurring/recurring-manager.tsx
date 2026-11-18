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
import { useI18n } from "@/components/i18n/locale-provider";
import type { Format } from "@/lib/i18n/format";
import { parseDate } from "@/lib/period";
import { describeSchedule, monthlyEquivalent } from "@/lib/recurring";
import type { CategoryDTO, WalletDTO } from "@/lib/queries/finance";
import type { RecurringDTO } from "@/lib/queries/planning";
import { cn } from "@/lib/utils";

function whenLabel(date: string, today: string, t: ReturnType<typeof useI18n>["t"], fmt: Format) {
  const d = differenceInCalendarDays(parseDate(date)!, parseDate(today)!);
  if (d <= 0) return t("common.today");
  if (d === 1) return t("common.tomorrow");
  if (d < 7) return t("common.inDays", { n: d });
  return fmt.shortYear(date, today);
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
  const { t, fmt, locale } = useI18n();
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
      else toast.error(t.dyn(r.error ?? "auth.err.generic"));
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
          {describeSchedule(r.startDate, r.frequency, r.interval, locale)} · {r.wallet.name}
        </p>
      </div>
      <div className="text-right">
        <p
          className={cn("num font-semibold", r.type === "INCOME" ? "text-income" : "text-expense")}
        >
          {fmt.money(r.type === "INCOME" ? r.amount : -r.amount, currency, { signed: true })}
        </p>
        <p className="text-muted-foreground text-[13px]">
          {r.active
            ? whenLabel(r.nextDate, today, t, fmt)
            : r.endDate && r.nextDate > r.endDate
              ? t("rec.finished")
              : t("rec.paused")}
        </p>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("cat.actions", { name: r.note || r.category.name })}
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
            <Pencil /> {t("common.edit")}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={pending}
            onSelect={() =>
              run(
                () => setRecurringActive(r.id, !r.active),
                r.active ? t("rec.pausedToast") : t("rec.resumed"),
              )
            }
          >
            {r.active ? (
              <>
                <Pause /> {t("rec.pause")}
              </>
            ) : (
              <>
                <Play /> {t("rec.resume")}
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-expense"
            disabled={pending}
            onSelect={() => run(() => deleteRecurring(r.id), t("rec.deleted"))}
          >
            <Trash2 className="!text-expense" /> {t("common.delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground max-w-xl text-sm">{t("rec.lead")}</p>
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus /> {t("rec.new")}
        </Button>
      </div>

      {rules.length === 0 ? (
        <Card>
          <EmptyState icon={Repeat} title={t("rec.empty")} description={t("rec.emptyText")} />
        </Card>
      ) : (
        <div className="grid gap-5">
          <div className="grid grid-cols-2 gap-3 sm:gap-5">
            <Card>
              <Overline>{t("rec.inPerMonth")}</Overline>
              <p className="num text-income mt-1 text-xl font-bold sm:text-2xl">
                {fmt.money(income, currency)}
              </p>
            </Card>
            <Card>
              <Overline>{t("rec.outPerMonth")}</Overline>
              <p className="num text-expense mt-1 text-xl font-bold sm:text-2xl">
                {fmt.money(-expense, currency)}
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
                {t("rec.pausedSection", { n: paused.length })}
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
        title={editing ? t("rec.editTitle") : t("rec.newTitle")}
        description={editing ? t("rec.editHint") : undefined}
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
