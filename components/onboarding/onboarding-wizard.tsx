"use client";

import { useState, useTransition } from "react";
import { Banknote, Check, CreditCard, PiggyBank, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CategoryIcon } from "@/components/ui/category-icon";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { completeOnboarding } from "@/lib/actions/onboarding";
import { CURRENCIES } from "@/lib/currencies";
import { DEFAULT_CATEGORIES } from "@/lib/design/category-palette";
import { cn } from "@/lib/utils";

const STEPS = ["Валюта", "Категории", "Счёт"] as const;
const WALLET_TYPES = [
  { value: "CARD", label: "Карта", icon: CreditCard },
  { value: "CASH", label: "Наличные", icon: Banknote },
  { value: "SAVINGS", label: "Сбережения", icon: PiggyBank },
] as const;

/** Мастер первого запуска (tasks.md 6.1–6.4). */
export function OnboardingWizard({ name }: { name: string }) {
  const [step, setStep] = useState(0);
  const [currency, setCurrency] = useState("RUB");
  const [keys, setKeys] = useState<string[]>(DEFAULT_CATEGORIES.map((c) => c.key));
  const [walletName, setWalletName] = useState("Карта");
  const [walletType, setWalletType] = useState<(typeof WALLET_TYPES)[number]["value"]>("CARD");
  const [balance, setBalance] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  const symbol = CURRENCIES.find((c) => c.code === currency)?.symbol ?? "";
  const hasIncome = DEFAULT_CATEGORIES.some((c) => c.type === "INCOME" && keys.includes(c.key));
  const hasExpense = DEFAULT_CATEGORIES.some((c) => c.type === "EXPENSE" && keys.includes(c.key));
  const toggle = (key: string) =>
    setKeys((ks) => (ks.includes(key) ? ks.filter((k) => k !== key) : [...ks, key]));

  const submit = () =>
    startTransition(async () => {
      const result = await completeOnboarding({
        currency,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        categoryKeys: keys,
        wallet: { name: walletName, type: walletType, initialBalance: balance },
      });
      if (result && !result.ok) setErrors(result.fieldErrors ?? { form: result.error });
    });

  return (
    <div>
      {/* Индикатор шагов */}
      <ol className="mb-6 flex items-center gap-2" aria-label="Шаги">
        {STEPS.map((label, i) => (
          <li
            key={label}
            className="flex flex-1 items-center gap-2"
            aria-current={i === step ? "step" : undefined}
          >
            <span
              className={cn(
                "inline-flex size-7 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold transition-colors",
                i < step
                  ? "bg-primary text-primary-foreground"
                  : i === step
                    ? "bg-primary/15 text-primary ring-primary ring-2"
                    : "bg-foreground/8 text-muted-foreground",
              )}
            >
              {i < step ? <Check className="size-4" /> : i + 1}
            </span>
            <span
              className={cn(
                "hidden text-sm font-medium sm:inline",
                i === step ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <span
                className={cn(
                  "h-0.5 flex-1 rounded-full",
                  i < step ? "bg-primary" : "bg-foreground/10",
                )}
              />
            )}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <section>
          <h1 className="text-[28px] leading-9 font-bold">Привет, {name.split(" ")[0]}! 👋</h1>
          <p className="text-muted-foreground mt-1 mb-5">В какой валюте вы ведёте учёт?</p>
          <div
            role="radiogroup"
            aria-label="Валюта"
            className="grid grid-cols-2 gap-2.5 sm:grid-cols-4"
          >
            {CURRENCIES.map((c) => (
              <button
                key={c.code}
                type="button"
                role="radio"
                aria-checked={currency === c.code}
                onClick={() => setCurrency(c.code)}
                className={cn(
                  "focus-visible:ring-ring flex flex-col items-start rounded-md border p-3 text-left transition-colors outline-none focus-visible:ring-2",
                  currency === c.code
                    ? "border-primary bg-primary/10"
                    : "border-glass-border bg-glass-strong hover:bg-foreground/4",
                )}
              >
                <span className="text-xl font-bold">{c.symbol}</span>
                <span className="text-sm font-semibold">{c.code}</span>
                <span className="text-muted-foreground text-xs">{c.name}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {step === 1 && (
        <section>
          <h1 className="text-[28px] leading-9 font-bold">Категории</h1>
          <p className="text-muted-foreground mt-1 mb-5">
            Снимите лишние — потом их всегда можно добавить или изменить.
          </p>
          {(["EXPENSE", "INCOME"] as const).map((type) => (
            <fieldset key={type} className="mb-4">
              <legend className="text-muted-foreground mb-2 text-xs font-semibold tracking-[0.04em] uppercase">
                {type === "EXPENSE" ? "Расходы" : "Доходы"}
              </legend>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {DEFAULT_CATEGORIES.filter((c) => c.type === type).map((c) => {
                  const on = keys.includes(c.key);
                  return (
                    <label
                      key={c.key}
                      className={cn(
                        "has-focus-visible:ring-ring flex cursor-pointer items-center gap-3 rounded-md border p-2.5 transition-colors has-focus-visible:ring-2",
                        on
                          ? "border-primary/40 bg-primary/8"
                          : "border-glass-border bg-glass-strong opacity-60",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => toggle(c.key)}
                        className="sr-only"
                      />
                      <CategoryIcon icon={c.icon} color={c.color} size="sm" />
                      <span className="flex-1 text-sm font-medium">{c.name}</span>
                      <span
                        className={cn(
                          "inline-flex size-5 items-center justify-center rounded-full border",
                          on
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-foreground/20",
                        )}
                      >
                        {on && <Check className="size-3.5" />}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ))}
          {(!hasIncome || !hasExpense) && (
            <p role="alert" className="text-expense text-[13px]">
              Оставьте хотя бы одну категорию доходов и одну — расходов.
            </p>
          )}
        </section>
      )}

      {step === 2 && (
        <section>
          <h1 className="text-[28px] leading-9 font-bold">Где лежат деньги?</h1>
          <p className="text-muted-foreground mt-1 mb-5">
            Создадим первый счёт. Остальные можно добавить в настройках.
          </p>
          <div className="grid gap-4">
            <div role="radiogroup" aria-label="Тип счёта" className="grid grid-cols-3 gap-2">
              {WALLET_TYPES.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={walletType === value}
                  onClick={() => {
                    setWalletType(value);
                    if (WALLET_TYPES.some((w) => w.label === walletName) || !walletName)
                      setWalletName(label);
                  }}
                  className={cn(
                    "focus-visible:ring-ring flex flex-col items-center gap-1.5 rounded-md border p-3 text-sm font-medium transition-colors outline-none focus-visible:ring-2",
                    walletType === value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-glass-border bg-glass-strong text-muted-foreground hover:bg-foreground/4",
                  )}
                >
                  <Icon className="size-6" /> {label}
                </button>
              ))}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="wallet-name">Название</Label>
              <Input
                id="wallet-name"
                value={walletName}
                onChange={(e) => setWalletName(e.target.value)}
                aria-invalid={Boolean(errors["wallet.name"])}
              />
              {errors["wallet.name"] && (
                <p className="text-expense text-[13px]">{errors["wallet.name"]}</p>
              )}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="wallet-balance">Сколько на нём сейчас</Label>
              <div className="relative">
                <Input
                  id="wallet-balance"
                  inputMode="decimal"
                  placeholder="0"
                  value={balance}
                  onChange={(e) => setBalance(e.target.value)}
                  aria-invalid={Boolean(errors["wallet.initialBalance"])}
                  className="num h-14 pr-14 text-[28px] font-semibold"
                />
                <span className="text-muted-foreground absolute top-1/2 right-4 -translate-y-1/2 text-lg font-semibold">
                  {symbol}
                </span>
              </div>
              {errors["wallet.initialBalance"] && (
                <p className="text-expense text-[13px]">{errors["wallet.initialBalance"]}</p>
              )}
            </div>
            {errors.form && (
              <p role="alert" className="bg-expense/10 text-expense rounded-sm px-3 py-2 text-sm">
                {errors.form}
              </p>
            )}
          </div>
        </section>
      )}

      <div className="mt-7 flex items-center justify-between gap-3">
        {step > 0 ? (
          <Button variant="ghost" onClick={() => setStep(step - 1)} disabled={pending}>
            Назад
          </Button>
        ) : (
          <span />
        )}
        {step < STEPS.length - 1 ? (
          <Button
            onClick={() => setStep(step + 1)}
            disabled={step === 1 && (!hasIncome || !hasExpense)}
          >
            Далее
          </Button>
        ) : (
          <Button onClick={submit} disabled={pending}>
            <Wallet /> {pending ? "Сохраняем…" : "Начать"}
          </Button>
        )}
      </div>
    </div>
  );
}
