"use client";

import { createContext, use, useMemo } from "react";
import { localePath, type Locale } from "@/lib/i18n/config";
import { createTranslator } from "@/lib/i18n/core";
import type { Dict } from "@/lib/i18n/dictionaries";
import { createFormat } from "@/lib/i18n/format";

const LocaleContext = createContext<{ locale: Locale; dict: Dict } | null>(null);

export function LocaleProvider({
  locale,
  dict,
  children,
}: {
  locale: Locale;
  dict: Dict;
  children: React.ReactNode;
}) {
  const value = useMemo(() => ({ locale, dict }), [locale, dict]);
  return <LocaleContext value={value}>{children}</LocaleContext>;
}

/** Переводы и форматирование в клиентских компонентах. */
export function useI18n() {
  const ctx = use(LocaleContext);
  if (!ctx) throw new Error("useI18n must be used within LocaleProvider");
  const { locale, dict } = ctx;
  return useMemo(
    () => ({
      locale,
      t: createTranslator(dict, locale),
      fmt: createFormat(locale),
      href: (path: string) => localePath(locale, path),
    }),
    [locale, dict],
  );
}
