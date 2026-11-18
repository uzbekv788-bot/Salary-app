"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { updateProfile } from "@/lib/actions/account";
import { CURRENCIES, currencySymbol } from "@/lib/currencies";
import { useI18n } from "@/components/i18n/locale-provider";

export function ProfileSection({
  name: n0,
  email,
  currency: c0,
  timezone: t0,
}: {
  name: string;
  email: string;
  currency: string;
  timezone: string;
}) {
  const { t, locale } = useI18n();
  const [name, setName] = useState(n0);
  const [currency, setCurrency] = useState(c0);
  const [timezone, setTimezone] = useState(t0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const zones = Intl.supportedValuesOf?.("timeZone") ?? [t0];
  const dirty = name !== n0 || currency !== c0 || timezone !== t0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("settings.profile")}</CardTitle>
      </CardHeader>
      <form
        noValidate
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(async () => {
            const r = await updateProfile({ name, currency, timezone });
            if (!r.ok) {
              setErrors(r.fieldErrors ?? {});
              toast.error(t.dyn(r.error));
              return;
            }
            setErrors({});
            toast.success(t("settings.profileSaved"));
          });
        }}
      >
        <div className="grid gap-1.5">
          <Label htmlFor="p-name">{t("auth.name")}</Label>
          <Input
            id="p-name"
            value={name}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={Boolean(errors.name)}
          />
          {errors.name && <p className="text-expense text-[13px]">{t.dyn(errors.name)}</p>}
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="p-email">Email</Label>
          <Input id="p-email" value={email} disabled />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="p-cur">{t("settings.currency")}</Label>
          <NativeSelect id="p-cur" value={currency} onChange={(e) => setCurrency(e.target.value)}>
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {currencySymbol(c.code, locale)} — {t(`currencies.${c.code}`)}
              </option>
            ))}
          </NativeSelect>
          {currency !== c0 && (
            <p className="text-muted-foreground text-[13px]">{t("settings.currencyHint")}</p>
          )}
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="p-tz">{t("settings.timezone")}</Label>
          <NativeSelect id="p-tz" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
            {zones.map((z) => (
              <option key={z} value={z}>
                {z.replace(/_/g, " ")}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2">
          <div className="text-muted-foreground flex items-center gap-3 text-sm">
            {t("settings.theme")} <ThemeToggle />
          </div>
          <Button type="submit" disabled={pending || !dirty}>
            {pending ? t("common.saving") : t("common.save")}
          </Button>
        </div>
      </form>
    </Card>
  );
}
