"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Archive,
  ArchiveRestore,
  Banknote,
  CircleDollarSign,
  CreditCard,
  Pencil,
  PiggyBank,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveSheet } from "@/components/ui/responsive-sheet";
import { NativeSelect } from "@/components/ui/native-select";
import { saveWallet, setWalletArchived } from "@/lib/actions/finance";
import { formatAmountInput, minorToInput } from "@/lib/format-input";
import type { WalletDTO } from "@/lib/queries/finance";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n/locale-provider";
import type { TKey } from "@/lib/i18n/core";

const TYPES = {
  CARD: { label: "settings.walletTypes.CARD", icon: CreditCard },
  CASH: { label: "settings.walletTypes.CASH", icon: Banknote },
  SAVINGS: { label: "settings.walletTypes.SAVINGS", icon: PiggyBank },
  OTHER: { label: "settings.walletTypes.OTHER", icon: CircleDollarSign },
} as const satisfies Record<string, { label: TKey; icon: unknown }>;

/** Счета с балансами и CRUD (tasks.md 7.5). */
export function WalletsSection({ wallets, currency }: { wallets: WalletDTO[]; currency: string }) {
  const { t, fmt } = useI18n();
  const [editing, setEditing] = useState<WalletDTO | null>(null);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const total = wallets.filter((w) => !w.archived).reduce((s, w) => s + w.balance, 0);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{t("settings.wallets")}</CardTitle>
          <p className="text-muted-foreground text-sm">
            {t("settings.walletsTotal")}{" "}
            <span className="num text-foreground font-semibold">{fmt.money(total, currency)}</span>
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus /> {t("common.add")}
        </Button>
      </CardHeader>
      <ul className="grid gap-1">
        {wallets.map((w) => {
          const T = TYPES[w.type];
          return (
            <li
              key={w.id}
              className={cn(
                "flex min-w-0 items-center gap-2 rounded-md px-1 py-2 sm:gap-3",
                w.archived && "opacity-55",
              )}
            >
              <span className="bg-primary/12 text-primary inline-flex size-10 items-center justify-center rounded-full">
                <T.icon className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">
                  {w.name}
                  {w.archived && t("settings.inArchive")}
                </p>
                <p className="text-muted-foreground text-[13px]">{t(T.label)}</p>
              </div>
              <span className={cn("num font-semibold", w.balance < 0 && "text-expense")}>
                {fmt.money(w.balance, currency)}
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t("settings.editWallet", { name: w.name })}
                onClick={() => {
                  setEditing(w);
                  setOpen(true);
                }}
              >
                <Pencil />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={pending}
                aria-label={
                  w.archived
                    ? t("settings.unarchiveWallet", { name: w.name })
                    : t("settings.archiveWallet", { name: w.name })
                }
                onClick={() =>
                  startTransition(async () => {
                    const r = await setWalletArchived(w.id, !w.archived);
                    if (r.ok)
                      toast.success(
                        w.archived ? t("settings.walletRestored") : t("settings.walletArchived"),
                      );
                    else toast.error(t.dyn(r.error));
                  })
                }
              >
                {w.archived ? <ArchiveRestore /> : <Archive />}
              </Button>
            </li>
          );
        })}
      </ul>
      <ResponsiveSheet
        open={open}
        onOpenChange={setOpen}
        title={editing ? t("settings.editWalletTitle") : t("settings.newWallet")}
      >
        <WalletForm
          key={`${editing?.id ?? "new"}-${open}`}
          initial={editing}
          onDone={() => setOpen(false)}
        />
      </ResponsiveSheet>
    </Card>
  );
}

function WalletForm({ initial, onDone }: { initial: WalletDTO | null; onDone: () => void }) {
  const { t } = useI18n();
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState<WalletDTO["type"]>(initial?.type ?? "CARD");
  const [balance, setBalance] = useState(initial ? minorToInput(initial.initialBalance) : "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  return (
    <form
      noValidate
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const r = await saveWallet({ name, type, initialBalance: balance }, initial?.id);
          if (!r.ok) {
            setErrors(r.fieldErrors ?? { form: r.error });
            return;
          }
          toast.success(initial ? t("settings.walletEdited") : t("settings.walletCreated"));
          onDone();
        });
      }}
    >
      <div className="grid gap-1.5">
        <Label htmlFor="w-name">{t("common.name")}</Label>
        <Input
          id="w-name"
          value={name}
          maxLength={40}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={Boolean(errors.name)}
        />
        {errors.name && <p className="text-expense text-[13px]">{t.dyn(errors.name)}</p>}
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="w-type">{t("common.type")}</Label>
        <NativeSelect
          id="w-type"
          value={type}
          onChange={(e) => setType(e.target.value as WalletDTO["type"])}
        >
          {Object.entries(TYPES).map(([v, def]) => (
            <option key={v} value={v}>
              {t(def.label)}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="w-bal">{t("settings.initialBalance")}</Label>
        <Input
          id="w-bal"
          inputMode="decimal"
          placeholder="0"
          value={balance}
          onChange={(e) => setBalance(formatAmountInput(e.target.value))}
          className="num"
          aria-invalid={Boolean(errors.initialBalance)}
        />
        <p className="text-muted-foreground text-[13px]">{t("settings.initialBalanceHint")}</p>
      </div>
      {errors.form && (
        <p role="alert" className="bg-expense/10 text-expense rounded-sm px-3 py-2 text-sm">
          {t.dyn(errors.form)}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? t("common.saving") : t("common.save")}
      </Button>
    </form>
  );
}
