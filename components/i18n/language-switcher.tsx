"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Globe } from "lucide-react";
import { useI18n } from "@/components/i18n/locale-provider";
import {
  LOCALE_COOKIE,
  LOCALE_NAMES,
  LOCALES,
  localePath,
  splitLocale,
  type Locale,
} from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

/**
 * Переключатель языка (tasks.md 18.1): запоминает выбор в cookie и открывает тот же экран
 * на другом языке. Полная загрузка — чтобы пришла статическая оболочка нужного языка.
 */
export function LanguageSwitcher({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const { locale, t } = useI18n();
  const pathname = usePathname();
  const search = useSearchParams().toString();

  const change = (next: Locale) => {
    if (next === locale) return;
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    const { path } = splitLocale(pathname);
    window.location.assign(localePath(next, path) + (search ? `?${search}` : ""));
  };

  return (
    <label
      className={cn(
        "glass relative inline-flex h-9 items-center gap-1.5 rounded-full pr-3 pl-2.5 text-sm font-semibold",
        className,
      )}
    >
      <Globe aria-hidden className="text-muted-foreground size-4" />
      <span className="sr-only">{t("common.language")}</span>
      <select
        value={locale}
        onChange={(e) => change(e.target.value as Locale)}
        className="[&>option]:bg-background cursor-pointer appearance-none bg-transparent pr-1 outline-none focus-visible:underline"
        aria-label={t("common.language")}
      >
        {LOCALES.map((l) => (
          <option key={l} value={l}>
            {compact ? l.toUpperCase() : LOCALE_NAMES[l]}
          </option>
        ))}
      </select>
    </label>
  );
}
