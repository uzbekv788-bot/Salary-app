"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/components/i18n/locale-provider";

type Props = React.ComponentProps<typeof Input> & { label: string; error?: string };

/** Поле формы с подписью и ошибкой под ним (design.md §7.5). */
export function FormField({ id, label, error, ...props }: Props & { id: string }) {
  const { t } = useI18n();
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        {...props}
      />
      {error && (
        <p id={`${id}-error`} className="text-expense text-[13px]">
          {t.dyn(error)}
        </p>
      )}
    </div>
  );
}
