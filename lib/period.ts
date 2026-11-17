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
import { ru } from "date-fns/locale";

export const PERIOD_KINDS = ["week", "month", "quarter", "year", "custom"] as const;
export type PeriodKind = (typeof PERIOD_KINDS)[number];
export type Granularity = "day" | "week" | "month";

export const PERIOD_LABELS: Record<PeriodKind, string> = {
  week: "Неделя",
  month: "Месяц",
  quarter: "Квартал",
  year: "Год",
  custom: "Свой период",
};

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

function labelFor(kind: PeriodKind, from: Date, to: Date): string {
  switch (kind) {
    case "month":
      return capitalize(format(from, "LLLL yyyy", { locale: ru }));
    case "quarter":
      return `${ROMAN[getQuarter(from) - 1]} квартал ${format(from, "yyyy")}`;
    case "year":
      return format(from, "yyyy");
    default: {
      const sameYear = from.getFullYear() === to.getFullYear();
      const sameMonth = sameYear && from.getMonth() === to.getMonth();
      if (sameMonth) return `${format(from, "d")}–${format(to, "d MMM yyyy", { locale: ru })}`;
      return `${format(from, sameYear ? "d MMM" : "d MMM yyyy", { locale: ru })} – ${format(to, "d MMM yyyy", { locale: ru })}`;
    }
  }
}

export function granularityFor(days: number): Granularity {
  if (days <= 31) return "day";
  if (days <= 92) return "week";
  return "month";
}

/** Разбирает параметры URL в конкретный диапазон дат (+ предыдущий период той же длины). */
export function resolvePeriod(params: Params, today: string): ResolvedPeriod {
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
  return {
    kind,
    from: fmt(from),
    to: fmt(to),
    prevFrom: fmt(subDays(from, days)),
    prevTo: fmt(subDays(from, 1)),
    days,
    granularity: granularityFor(days),
    label: labelFor(kind, from, to),
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
