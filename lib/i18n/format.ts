import { format } from "date-fns";
import { enUS, ru, uz } from "date-fns/locale";
import { INTL_LOCALE, type Locale } from "@/lib/i18n/config";
import { formatCompact, formatMoney, formatPercent } from "@/lib/money";
import { parseDate } from "@/lib/period";

export const DATE_FNS_LOCALE = { ru, en: enUS, uz } as const;

/** Сокращения для осей графиков по-узбекски: 120 ming, 1,3 mln, 2 mlrd. */
function compactUz(minor: number | bigint): string {
  const v = Number(minor) / 100;
  const abs = Math.abs(v);
  const n = (x: number) => new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 }).format(x);
  const sign = v < 0 ? "\u2212" : "";
  if (abs >= 1e9) return `${sign}${n(abs / 1e9)} mlrd`;
  if (abs >= 1e6) return `${sign}${n(abs / 1e6)} mln`;
  if (abs >= 1e3) return `${sign}${n(abs / 1e3)} ming`;
  return sign + n(abs);
}

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
    ) => {
      const out = formatMoney(minor, currency, {
        ...opts,
        intl,
        display: locale === "en" ? "narrowSymbol" : "symbol",
      });
      // Узбекский форматируется по ru-RU (см. INTL_LOCALE): сум — латиницей
      return locale === "uz" ? out.replace(/\bUZS\b|сум|сўм/g, "soʻm") : out;
    },
    compact: (minor: number | bigint) =>
      locale === "uz" ? compactUz(minor) : formatCompact(minor, intl),
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
