"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { Repeat, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CategoryIcon } from "@/components/ui/category-icon";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Segmented } from "@/components/ui/segmented";
import { deleteTransaction, restoreTransaction, saveTransaction } from "@/lib/actions/finance";
import { enqueue, isNetworkError, newClientId } from "@/lib/offline-queue";
import { formatMoney, parseAmount } from "@/lib/money";
import type { TransactionInput } from "@/lib/validators/finance";
import { formatAmountInput, minorToInput } from "@/lib/format-input";
import { CURRENCIES } from "@/lib/currencies";
import type { CategoryDTO, TransactionDTO, WalletDTO } from "@/lib/queries/finance";
import { cn } from "@/lib/utils";

type TxType = "INCOME" | "EXPENSE";
const LAST_KEY = "salary:last";

function readLast(): { EXPENSE?: string; INCOME?: string; wallet?: string } {
  try {
    return JSON.parse(localStorage.getItem(LAST_KEY) ?? "{}");
  } catch {
    return {};
  }
}
function writeLast(patch: Record<string, string>) {
  try {
    localStorage.setItem(LAST_KEY, JSON.stringify({ ...readLast(), ...patch }));
  } catch {
    /* приватный режим — не страшно */
  }
}

/** Форма операции (tasks.md 8.3): ввод за несколько секунд, последняя категория запоминается. */
export function TransactionForm({
  categories,
  wallets,
  today,
  currency,
  initial,
  onDone,
  userId,
}: {
  categories: CategoryDTO[];
  wallets: WalletDTO[];
  today: string;
  currency: string;
  initial: TransactionDTO | null;
  onDone: () => void;
  /** Для офлайн-очереди: чьи это записи */
  userId?: string;
}) {
  // Форма рендерится только в браузере (внутри модалки), поэтому localStorage доступен
  const [last] = useState(() => (typeof window === "undefined" ? {} : readLast()));
  const validCat = (id?: string) =>
    categories.some((c) => c.id === id && c.type === "EXPENSE" && !c.archived) ? id! : "";
  const [type, setType] = useState<TxType>(initial?.type ?? "EXPENSE");
  const [amount, setAmount] = useState(initial ? minorToInput(initial.amount) : "");
  const [categoryId, setCategoryId] = useState(() => initial?.categoryId ?? validCat(last.EXPENSE));
  const [walletId, setWalletId] = useState(
    () =>
      initial?.walletId ??
      (wallets.some((w) => w.id === last.wallet && !w.archived)
        ? last.wallet!
        : (wallets.find((w) => !w.archived)?.id ?? "")),
  );
  const [date, setDate] = useState(initial?.date ?? today);
  const [note, setNote] = useState(initial?.note ?? "");
  const [repeat, setRepeat] = useState<"" | "WEEKLY" | "MONTHLY" | "YEARLY">("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const amountRef = useRef<HTMLInputElement>(null);

  const visible = categories.filter(
    (c) => c.type === type && (!c.archived || c.id === initial?.categoryId),
  );
  const symbol = CURRENCIES.find((c) => c.code === currency)?.symbol ?? currency;

  useEffect(() => {
    // Автофокус на сумме только на устройствах с мышью — на телефоне клавиатура перекрыла бы форму
    if (window.matchMedia("(pointer: fine)").matches) amountRef.current?.focus();
  }, []);

  const switchType = (t: TxType) => {
    setType(t);
    const remembered = readLast()[t];
    setCategoryId(
      categories.some((c) => c.id === remembered && c.type === t && !c.archived) ? remembered! : "",
    );
  };

  /** Без сети: проверяем сами и кладём в очередь на устройстве (tasks.md 17.3). */
  const saveOffline = async (input: TransactionInput & { clientId: string }) => {
    if (!userId) return setErrors({ form: "Нет сети. Попробуйте ещё раз, когда связь появится." });
    const minor = parseAmount(amount);
    if (minor === null || minor <= 0) return setErrors({ amount: "Введите сумму больше нуля" });
    const cat = categories.find((c) => c.id === categoryId);
    await enqueue({
      clientId: input.clientId,
      userId,
      input,
      repeat: repeat || undefined,
      label: `${cat?.name ?? "Операция"} · ${formatMoney(type === "INCOME" ? minor : -minor, currency, { signed: true })}`,
    });
    writeLast({ [type]: categoryId, wallet: walletId });
    toast.success("Сохранено на устройстве", {
      description: "Нет сети — отправим автоматически, когда связь появится",
    });
    onDone();
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId) return setErrors({ categoryId: "Выберите категорию" });
    if (initial && !navigator.onLine)
      return setErrors({ form: "Без сети можно только добавлять новые операции" });
    // ID с устройства: если ответ сервера потеряется и запрос уйдёт повторно — дубля не будет
    const input = {
      type,
      amount,
      categoryId,
      walletId,
      date,
      note,
      clientId: initial ? undefined : newClientId(),
    };
    startTransition(async () => {
      if (!initial && !navigator.onLine)
        return saveOffline(input as typeof input & { clientId: string });
      let res;
      try {
        res = await saveTransaction(input, initial?.id, initial ? undefined : repeat || undefined);
      } catch (err) {
        if (!initial && isNetworkError(err))
          return saveOffline(input as typeof input & { clientId: string });
        throw err;
      }
      if (!res.ok) return setErrors(res.fieldErrors ?? { form: res.error });
      writeLast({ [type]: categoryId, wallet: walletId });
      toast.success(
        initial ? "Операция изменена" : type === "INCOME" ? "Доход добавлен" : "Расход добавлен",
        repeat && !initial
          ? { description: "Будет повторяться автоматически — см. «Регулярные»" }
          : undefined,
      );
      const b = res.data.budget;
      if (b) {
        const pct = Math.round(b.pct * 100);
        if (b.status === "over")
          toast.error(`Бюджет «${b.name}» превышен: ${pct}% от лимита`, { duration: 6000 });
        else toast.warning(`Бюджет «${b.name}» почти исчерпан: ${pct}%`, { duration: 6000 });
      }
      onDone();
    });
  };
  const remove = () =>
    startTransition(async () => {
      if (!initial) return;
      if (!navigator.onLine) {
        toast.error("Без сети удалить операцию нельзя");
        return;
      }
      const res = await deleteTransaction(initial.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      onDone();
      toast("Операция удалена", {
        duration: 5000,
        action: {
          label: "Отменить",
          onClick: async () => {
            const r = await restoreTransaction(initial.id);
            if (r.ok) toast.success("Операция восстановлена");
            else toast.error(r.error);
          },
        },
      });
    });

  return (
    <form onSubmit={submit} noValidate className="grid gap-4">
      <Segmented
        label="Тип операции"
        value={type}
        onChange={switchType}
        options={[
          { value: "EXPENSE", label: "Расход", activeClass: "bg-expense text-expense-foreground" },
          {
            value: "INCOME",
            label: "Доход",
            activeClass: "bg-income text-income-foreground",
          },
        ]}
      />

      <div className="grid gap-1.5">
        <Label htmlFor="tx-amount">Сумма</Label>
        <div className="relative">
          <Input
            ref={amountRef}
            id="tx-amount"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(formatAmountInput(e.target.value))}
            aria-invalid={Boolean(errors.amount)}
            className={cn(
              "num h-16 pr-16 text-[32px] font-bold",
              type === "INCOME" ? "text-income" : "text-expense",
            )}
          />
          <span className="text-muted-foreground absolute top-1/2 right-4 -translate-y-1/2 text-xl font-semibold">
            {symbol}
          </span>
        </div>
        {errors.amount && <p className="text-expense text-[13px]">{errors.amount}</p>}
      </div>

      <fieldset className="grid gap-1.5">
        <legend className="text-muted-foreground mb-1.5 text-[13px] font-medium">Категория</legend>
        <div
          role="radiogroup"
          aria-label="Категория"
          className="grid max-h-52 grid-cols-3 gap-1.5 overflow-y-auto p-0.5 sm:grid-cols-4"
        >
          {visible.map((c) => (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={categoryId === c.id}
              onClick={() => {
                setCategoryId(c.id);
                setErrors((e) => ({ ...e, categoryId: "" }));
              }}
              className={cn(
                "focus-visible:ring-ring flex flex-col items-center gap-1 rounded-md p-2 text-center text-xs leading-tight font-medium transition-colors outline-none focus-visible:ring-2",
                categoryId === c.id
                  ? "bg-primary/12 text-foreground ring-primary ring-2"
                  : "text-muted-foreground hover:bg-foreground/5",
              )}
            >
              <CategoryIcon icon={c.icon} color={c.color} />
              <span className="line-clamp-2">{c.name}</span>
            </button>
          ))}
        </div>
        {errors.categoryId && <p className="text-expense text-[13px]">{errors.categoryId}</p>}
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="tx-date">Дата</Label>
          <Input
            id="tx-date"
            type="date"
            value={date}
            max="2100-12-31"
            onChange={(e) => setDate(e.target.value)}
            aria-invalid={Boolean(errors.date)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="tx-wallet">Счёт</Label>
          <NativeSelect
            id="tx-wallet"
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
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="tx-note">Комментарий</Label>
        <Input
          id="tx-note"
          maxLength={200}
          placeholder="Например, Пятёрочка"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      {initial ? (
        initial.recurringId && (
          <p className="bg-foreground/5 text-muted-foreground flex items-start gap-2 rounded-sm px-3 py-2 text-[13px]">
            <Repeat aria-hidden className="mt-0.5 size-4 shrink-0" />
            <span>
              Создана регулярным платежом. Изменения коснутся только этой операции —{" "}
              <Link
                href="/recurring"
                className="text-primary font-semibold hover:underline"
                onClick={onDone}
              >
                правило
              </Link>{" "}
              останется прежним.
            </span>
          </p>
        )
      ) : (
        <div className="grid gap-1.5">
          <Label htmlFor="tx-repeat">Повторять</Label>
          <NativeSelect
            id="tx-repeat"
            value={repeat}
            onChange={(e) => setRepeat(e.target.value as typeof repeat)}
          >
            <option value="">Не повторять</option>
            <option value="WEEKLY">Каждую неделю</option>
            <option value="MONTHLY">Каждый месяц</option>
            <option value="YEARLY">Каждый год</option>
          </NativeSelect>
        </div>
      )}

      {errors.form && (
        <p role="alert" className="bg-expense/10 text-expense rounded-sm px-3 py-2 text-sm">
          {errors.form}
        </p>
      )}

      <div className="flex gap-2">
        {initial && (
          <Button
            type="button"
            variant="secondary"
            size="icon"
            onClick={remove}
            disabled={pending}
            aria-label="Удалить операцию"
            className="text-expense"
          >
            <Trash2 />
          </Button>
        )}
        <Button type="submit" className="flex-1" disabled={pending}>
          {pending ? "Сохраняем…" : initial ? "Сохранить" : "Добавить"}
        </Button>
      </div>
    </form>
  );
}
