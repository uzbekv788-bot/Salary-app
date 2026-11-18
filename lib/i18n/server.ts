import { cookies } from "next/headers";
import { lang } from "next/root-params";
import {
  DEFAULT_LOCALE,
  isLocale,
  LOCALE_COOKIE,
  localePath,
  type Locale,
} from "@/lib/i18n/config";
import { createTranslator } from "@/lib/i18n/core";
import { dictionaries } from "@/lib/i18n/dictionaries";
import { createFormat } from "@/lib/i18n/format";

/**
 * Язык текущего запроса. В Server Components — из сегмента [lang] (next/root-params,
 * без чтения cookie — статическая оболочка остаётся статической). В Server Actions
 * root params недоступны — тогда из cookie, которую выставляет proxy.ts.
 */
export async function getLocale(): Promise<Locale> {
  try {
    const l = await lang();
    if (isLocale(l)) return l;
  } catch {
    /* Server Action / Route Handler */
  }
  const c = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(c) ? c : DEFAULT_LOCALE;
}

export async function getI18n() {
  const locale = await getLocale();
  return {
    locale,
    t: createTranslator(dictionaries[locale], locale),
    fmt: createFormat(locale),
    href: (path: string) => localePath(locale, path),
  };
}
