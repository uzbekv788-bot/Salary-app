/**
 * Периоды аналитики (SPEC.md §4, §6). Даты — строки "YYYY-MM-DD" без времени,
 * все вычисления в локальной полночи, чтобы не зависеть от часового пояса сервера.
 * Состояние хранится в URL: ?period=month&date=2026-11-14 или ?period=custom&from=…&to=…
 */
import {
  addDays,
  addMonths,
  addQuarters,
  addWeeks,
  addYears,
  differenceInCalendarDays,
  endOfMonth,
  endOfQuarter,
  endOfWeek,
  endOfYear,
  format,
  getQuarter,
  isValid,
  parse,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
  startOfYear,
  subDays,
} from "date-fns";
import { enUS, ru, uz } from "date-fns/locale";

export const PERIOD_KINDS = ["week", "month", "quarter", "year", "custom"] as const;
export type PeriodKind = (typeof PERIOD_KINDS)[number];
export type Granularity = "day" | "week" | "month";

export type ResolvedPeriod = {
  kind: PeriodKind;
  /** Включительно */
  from: string;
  /** Включительно */
  to: string;
  prevFrom: string;
  prevTo: string;
  days: number;
  granularity: Granularity;
  label: string;
  /** Параметры URL для кнопок ← → (null у произвольного периода) */
  prevParams: Record<string, string> | null;
  nextParams: Record<string, string> | null;
  /** Период содержит сегодняшний день — «вперёд» листать некуда */
  isCurrent: boolean;
};

type Params = Record<string, string | string[] | undefined>;

const ISO = "yyyy-MM-dd";
const fmt = (d: Date) => format(d, ISO);
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export function parseDate(value: string | undefined | null): Date | null {
  if (!value) return null;
  const d = parse(value, ISO, new Date(2000, 0, 1));
  return isValid(d) && fmt(d) === value ? d : null;
}

/** Сегодняшняя дата в часовом поясе пользователя. */
export function todayIn(timeZone: string, now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function rangeFor(kind: Exclude<PeriodKind, "custom">, anchor: Date): [Date, Date] {
  switch (kind) {
    case "week":
      return [startOfWeek(anchor, { weekStartsOn: 1 }), endOfWeek(anchor, { weekStartsOn: 1 })];
    case "month":
      return [startOfMonth(anchor), endOfMonth(anchor)];
    case "quarter":
      return [startOfQuarter(anchor), endOfQuarter(anchor)];
    case "year":
      return [startOfYear(anchor), endOfYear(anchor)];
  }
}

const shift: Record<Exclude<PeriodKind, "custom">, (d: Date, n: number) => Date> = {
  week: addWeeks,
  month: addMonths,
  quarter: addQuarters,
  year: addYears,
};

const ROMAN = ["I", "II", "III", "IV"];
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const DATE_LOCALES = { ru, en: enUS, uz } as const;
export type PeriodLocale = keyof typeof DATE_LOCALES;

/** Подпись периода на языке интерфейса: «Ноябрь 2026» / «November 2026» / «Noyabr 2026». */
function labelFor(kind: PeriodKind, from: Date, to: Date, lang: PeriodLocale): string {
  const locale = DATE_LOCALES[lang];
  const q = getQuarter(from);
  const y = format(from, "yyyy");
  switch (kind) {
    case "month":
      return capitalize(format(from, "LLLL yyyy", { locale }));
    case "quarter":
      return lang === "en"
        ? `Q${q} ${y}`
        : lang === "uz"
          ? `${y}-yil ${q}-chorak`
          : `${ROMAN[q - 1]} квартал ${y}`;
    case "year":
      return y;
    default: {
      const sameYear = from.getFullYear() === to.getFullYear();
      const sameMonth = sameYear && from.getMonth() === to.getMonth();
      if (lang === "en") {
        if (sameMonth)
          return `${format(from, "MMM d", { locale })}–${format(to, "d, yyyy", { locale })}`;
        return `${format(from, sameYear ? "MMM d" : "MMM d, yyyy", { locale })} – ${format(to, "MMM d, yyyy", { locale })}`;
      }
      if (sameMonth) return `${format(from, "d")}–${format(to, "d MMM yyyy", { locale })}`;
      return `${format(from, sameYear ? "d MMM" : "d MMM yyyy", { locale })} – ${format(to, "d MMM yyyy", { locale })}`;
    }
  }
}

export function granularityFor(days: number): Granularity {
  if (days <= 31) return "day";
  if (days <= 92) return "week";
  return "month";
}

/** Разбирает параметры URL в конкретный диапазон дат (+ предыдущий период той же длины). */
export function resolvePeriod(
  params: Params,
  today: string,
  lang: PeriodLocale = "ru",
): ResolvedPeriod {
  const todayDate = parseDate(today)!;
  const rawKind = first(params.period);
  let kind: PeriodKind = PERIOD_KINDS.includes(rawKind as PeriodKind)
    ? (rawKind as PeriodKind)
    : "month";

  let from: Date;
  let to: Date;
  let prevParams: ResolvedPeriod["prevParams"] = null;
  let nextParams: ResolvedPeriod["nextParams"] = null;

  const customFrom = parseDate(first(params.from));
  const customTo = parseDate(first(params.to));

  if (kind === "custom" && customFrom && customTo) {
    [from, to] = customFrom <= customTo ? [customFrom, customTo] : [customTo, customFrom];
    // Ограничиваем произвольный период 5 годами, чтобы запросы оставались быстрыми
    if (differenceInCalendarDays(to, from) > 366 * 5) from = subDays(to, 366 * 5);
  } else {
    if (kind === "custom") kind = "month";
    const anchor = parseDate(first(params.date)) ?? todayDate;
    [from, to] = rangeFor(kind, anchor);
    prevParams = { period: kind, date: fmt(shift[kind](from, -1)) };
    nextParams = { period: kind, date: fmt(shift[kind](from, 1)) };
  }

  const days = differenceInCalendarDays(to, from) + 1;
  const isCurrent = from <= todayDate && todayDate <= to;

  // Предыдущий период: для неделя/месяц/квартал/год — предыдущий календарный (октябрь для ноября),
  // для произвольного — столько же дней перед ним.
  let prevFrom: Date;
  let prevTo: Date;
  if (kind === "custom") {
    prevFrom = subDays(from, days);
    prevTo = subDays(from, 1);
  } else {
    [prevFrom, prevTo] = rangeFor(kind, shift[kind](from, -1));
  }
  // Текущий незавершённый период честно сравниваем с тем же числом дней прошлого:
  // 1–17 ноября против 1–17 октября, а не против всего октября.
  if (isCurrent) {
    const elapsed = differenceInCalendarDays(todayDate, from);
    const cut = addDays(prevFrom, elapsed);
    if (cut < prevTo) prevTo = cut;
  }

  return {
    kind,
    from: fmt(from),
    to: fmt(to),
    prevFrom: fmt(prevFrom),
    prevTo: fmt(prevTo),
    days,
    granularity: granularityFor(days),
    label: labelFor(kind, from, to, lang),
    prevParams,
    nextParams: isCurrent || to >= todayDate ? null : nextParams,
    isCurrent,
  };
}

/** Список всех дат периода — для заполнения пустых дней на графике. */
export function eachDay(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = parseDate(from)!; fmt(d) <= to; d = addDays(d, 1)) out.push(fmt(d));
  return out;
}
