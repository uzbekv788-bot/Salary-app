"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CategoryIcon } from "@/components/ui/category-icon";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Segmented } from "@/components/ui/segmented";
import { saveRecurring } from "@/lib/actions/planning";
import { formatAmountInput, minorToInput } from "@/lib/format-input";
import { describeSchedule, type Frequency } from "@/lib/recurring";
import type { CategoryDTO, WalletDTO } from "@/lib/queries/finance";
import type { RecurringDTO } from "@/lib/queries/planning";
import { cn } from "@/lib/utils";

/** Создание/редактирование регулярной операции (tasks.md 15.4). */
export function RecurringForm({
  categories,
  wallets,
  today,
  initial,
  onDone,
}: {
  categories: CategoryDTO[];
  wallets: WalletDTO[];
  today: string;
  initial: RecurringDTO | null;
  onDone: () => void;
}) {
  const [type, setType] = useState<"INCOME" | "EXPENSE">(initial?.type ?? "EXPENSE");
  const [amount, setAmount] = useState(initial ? minorToInput(initial.amount) : "");
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "");
  const [walletId, setWalletId] = useState(
    initial?.walletId ?? wallets.find((w) => !w.archived)?.id ?? "",
  );
  const [frequency, setFrequency] = useState<Frequency>(initial?.frequency ?? "MONTHLY");
  const [interval, setInterval] = useState(String(initial?.interval ?? 1));
  const [nextDate, setNextDate] = useState(initial?.nextDate ?? today);
  const [endDate, setEndDate] = useState(initial?.endDate ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const visible = categories.filter(
    (c) => c.type === type && (!c.archived || c.id === initial?.categoryId),
  );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId) return setErrors({ categoryId: "Выберите категорию" });
    startTransition(async () => {
      const r = await saveRecurring(
        {
          type,
          amount,
          categoryId,
          walletId,
          frequency,
          interval: Number(interval),
          nextDate,
          endDate,
          note,
        },
        initial?.id,
      );
      if (!r.ok) {
        setErrors(r.fieldErrors ?? { form: r.error });
        return;
      }
      toast.success(initial ? "Регулярный платёж изменён" : "Регулярный платёж создан", {
        description: nextDate <= today ? "Операции за наступившие даты уже добавлены" : undefined,
      });
      onDone();
    });
  };

  return (
    <form onSubmit={submit} noValidate className="grid gap-4">
      <Segmented
        label="Тип"
        value={type}
        onChange={(t) => {
          setType(t);
          setCategoryId("");
        }}
        options={[
          { value: "EXPENSE", label: "Расход", activeClass: "bg-expense text-expense-foreground" },
          { value: "INCOME", label: "Доход", activeClass: "bg-income text-income-foreground" },
        ]}
      />
      <div className="grid gap-1.5">
        <Label htmlFor="rr-amount">Сумма</Label>
        <Input
          id="rr-amount"
          inputMode="decimal"
          placeholder="0"
          value={amount}
          onChange={(e) => setAmount(formatAmountInput(e.target.value))}
          aria-invalid={Boolean(errors.amount)}
          className="num h-14 text-2xl font-bold"
        />
        {errors.amount && <p className="text-expense text-[13px]">{errors.amount}</p>}
      </div>
      <fieldset>
        <legend className="text-muted-foreground mb-1.5 text-[13px] font-medium">Категория</legend>
        <div
          role="radiogroup"
          aria-label="Категория"
          className="grid max-h-40 grid-cols-3 gap-1.5 overflow-y-auto p-0.5 sm:grid-cols-4"
        >
          {visible.map((c) => (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={categoryId === c.id}
              onClick={() => setCategoryId(c.id)}
              className={cn(
                "focus-visible:ring-ring flex flex-col items-center gap-1 rounded-md p-2 text-center text-xs leading-tight font-medium outline-none focus-visible:ring-2",
                categoryId === c.id
                  ? "bg-primary/12 ring-primary ring-2"
                  : "text-muted-foreground hover:bg-foreground/5",
              )}
            >
              <CategoryIcon icon={c.icon} color={c.color} size="sm" />
              <span className="line-clamp-2">{c.name}</span>
            </button>
          ))}
        </div>
        {errors.categoryId && <p className="text-expense mt-1 text-[13px]">{errors.categoryId}</p>}
      </fieldset>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="rr-freq">Как часто</Label>
          <NativeSelect
            id="rr-freq"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as Frequency)}
          >
            <option value="WEEKLY">Неделя</option>
            <option value="MONTHLY">Месяц</option>
            <option value="YEARLY">Год</option>
          </NativeSelect>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="rr-int">Каждые</Label>
          <NativeSelect id="rr-int" value={interval} onChange={(e) => setInterval(e.target.value)}>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {i + 1}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="rr-next">{initial ? "Следующий раз" : "Первый раз"}</Label>
          <Input
            id="rr-next"
            type="date"
            value={nextDate}
            onChange={(e) => setNextDate(e.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="rr-end">До (необязательно)</Label>
          <Input
            id="rr-end"
            type="date"
            value={endDate}
            min={nextDate}
            onChange={(e) => setEndDate(e.target.value)}
            aria-invalid={Boolean(errors.endDate)}
          />
        </div>
      </div>
      {nextDate && (
        <p className="text-muted-foreground -mt-1 text-[13px]">
          {describeSchedule(nextDate, frequency, Number(interval))}
          {nextDate < today && " · прошедшие даты будут добавлены сразу"}
        </p>
      )}
      {errors.endDate && <p className="text-expense text-[13px]">{errors.endDate}</p>}
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="rr-wallet">Счёт</Label>
          <NativeSelect
            id="rr-wallet"
            value={walletId}
            onChange={(e) => setWalletId(e.target.value)}
          >
            {wallets
              .filter((w) => !w.archived || w.id === initial?.walletId)
              .map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
          </NativeSelect>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="rr-note">Комментарий</Label>
          <Input
            id="rr-note"
            maxLength={200}
            placeholder="Аренда, Netflix…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      </div>
      {errors.form && (
        <p role="alert" className="bg-expense/10 text-expense rounded-sm px-3 py-2 text-sm">
          {errors.form}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Сохраняем…" : initial ? "Сохранить" : "Создать"}
      </Button>
    </form>
  );
}
