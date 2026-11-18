import { format } from "date-fns";
import { enUS, ru, uz } from "date-fns/locale";
import { INTL_LOCALE, type Locale } from "@/lib/i18n/config";
import { formatCompact, formatMoney, formatPercent } from "@/lib/money";
import { parseDate } from "@/lib/period";

export const DATE_FNS_LOCALE = { ru, en: enUS, uz } as const;

/** Форматирование чисел, денег и дат по языку интерфейса (tasks.md 18.1). */
export function createFormat(locale: Locale) {
  const intl = INTL_LOCALE[locale];
  const dl = DATE_FNS_LOCALE[locale];
  const d = (date: string, pattern: string) => format(parseDate(date)!, pattern, { locale: dl });
  return {
    locale,
    intl,
    dateLocale: dl,
    money: (
      minor: number | bigint,
      currency = "RUB",
      opts: { signed?: boolean; cents?: boolean } = {},
    ) => formatMoney(minor, currency, { ...opts, intl }),
    compact: (minor: number | bigint) => formatCompact(minor, intl),
    percent: (fraction: number, opts: { signed?: boolean } = {}) =>
      formatPercent(fraction, { ...opts, intl }),
    number: (n: number) => new Intl.NumberFormat(intl).format(n),
    /** «14 нояб.» / «Nov 14» */
    short: (date: string) => d(date, locale === "en" ? "MMM d" : "d MMM"),
    /** С годом, если он не текущий */
    shortYear: (date: string, today: string) =>
      date.slice(0, 4) === today.slice(0, 4)
        ? d(date, locale === "en" ? "MMM d" : "d MMM")
        : d(date, locale === "en" ? "MMM d, yyyy" : "d MMM yyyy"),
    /** «12 ноября, среда» */
    long: (date: string, withYear: boolean) =>
      locale === "en"
        ? d(date, withYear ? "EEEE, MMMM d, yyyy" : "EEEE, MMMM d")
        : d(date, withYear ? "d MMMM yyyy, EEEE" : "d MMMM, EEEE"),
    pattern: d,
  };
}
export type Format = ReturnType<typeof createFormat>;
