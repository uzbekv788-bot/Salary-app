/** Языки интерфейса (tasks.md 18). Русский — основной: его адреса без префикса (/dashboard). */
export const LOCALES = ["ru", "en", "uz"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "ru";
export const LOCALE_COOKIE = "NEXT_LOCALE";

export const LOCALE_NAMES: Record<Locale, string> = {
  ru: "Русский",
  en: "English",
  uz: "Oʻzbekcha",
};
/** Теги для Intl (числа, деньги, даты) */
export const INTL_LOCALE: Record<Locale, string> = { ru: "ru-RU", en: "en-US", uz: "uz-Latn-UZ" };

export const isLocale = (v: unknown): v is Locale =>
  typeof v === "string" && (LOCALES as readonly string[]).includes(v);

/** Путь с учётом языка: ru → /dashboard, en → /en/dashboard. */
export function localePath(locale: Locale, path: string): string {
  if (!path.startsWith("/") || path.startsWith("//")) return path;
  if (locale === DEFAULT_LOCALE) return path;
  return path === "/" ? `/${locale}` : `/${locale}${path}`;
}

/** Убирает префикс языка: /en/dashboard → { locale: "en", path: "/dashboard" }. */
export function splitLocale(pathname: string): { locale: Locale | null; path: string } {
  const seg = pathname.split("/")[1];
  if (isLocale(seg)) return { locale: seg, path: pathname.slice(seg.length + 1) || "/" };
  return { locale: null, path: pathname };
}

/** Выбор языка по заголовку Accept-Language браузера. */
export function negotiateLocale(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;
  const prefs = acceptLanguage
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { lang: tag.toLowerCase().split("-")[0], q: q ? Number(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);
  for (const p of prefs) if (isLocale(p.lang)) return p.lang;
  return DEFAULT_LOCALE;
}
