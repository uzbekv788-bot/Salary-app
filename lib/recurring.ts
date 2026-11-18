/**
 * Расчёт дат регулярных операций (PRD v1.1). Чистые функции без БД — покрыты unit-тестами.
 * Дата k-го повторения считается от startDate, а не от предыдущей даты, поэтому месяцы
 * с 31-м числом не «съезжают»: 31 янв → 28 фев → 31 мар (date-fns сам прижимает к концу месяца).
 */
import { addDays, addMonths, addWeeks, addYears, format, getDate } from "date-fns";
import { parseDate } from "@/lib/period";

export type Frequency = "WEEKLY" | "MONTHLY" | "YEARLY";

/** Защита от зацикливания: за один проход создаём не больше стольких повторений одного правила. */
export const MAX_CATCH_UP = 400;

export function occurrence(
  startDate: string,
  frequency: Frequency,
  interval: number,
  k: number,
): string {
  const start = parseDate(startDate)!;
  const step = k * Math.max(1, interval);
  const d =
    frequency === "WEEKLY"
      ? addWeeks(start, step)
      : frequency === "MONTHLY"
        ? addMonths(start, step)
        : addYears(start, step);
  return format(d, "yyyy-MM-dd");
}

/**
 * Какие повторения пора создать на сегодня: номера и даты, начиная с `count`,
 * пока дата ≤ сегодня и ≤ endDate. Возвращает их и состояние правила после.
 */
export function dueOccurrences(
  rule: {
    startDate: string;
    frequency: Frequency;
    interval: number;
    count: number;
    endDate: string | null;
  },
  today: string,
): { dates: string[]; count: number; nextDate: string; finished: boolean } {
  const dates: string[] = [];
  let k = rule.count;
  let next = occurrence(rule.startDate, rule.frequency, rule.interval, k);
  while (next <= today && (!rule.endDate || next <= rule.endDate) && dates.length < MAX_CATCH_UP) {
    dates.push(next);
    k++;
    next = occurrence(rule.startDate, rule.frequency, rule.interval, k);
  }
  return {
    dates,
    count: k,
    nextDate: next,
    finished: Boolean(rule.endDate && next > rule.endDate),
  };
}

const MONTHS_PER: Record<Frequency, number> = { WEEKLY: 12 / 52, MONTHLY: 1, YEARLY: 12 };

/** Сумма правила, приведённая к месяцу, — для сводки «в месяц регулярно уходит/приходит». */
export function monthlyEquivalent(amount: number, frequency: Frequency, interval: number): number {
  return Math.round(amount / (MONTHS_PER[frequency] * Math.max(1, interval)));
}

const WEEKDAYS = {
  ru: ["воскресеньям", "понедельникам", "вторникам", "средам", "четвергам", "пятницам", "субботам"],
  en: ["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"],
  uz: ["yakshanba", "dushanba", "seshanba", "chorshanba", "payshanba", "juma", "shanba"],
};
const MONTHS_GEN = {
  ru: [
    "января",
    "февраля",
    "марта",
    "апреля",
    "мая",
    "июня",
    "июля",
    "августа",
    "сентября",
    "октября",
    "ноября",
    "декабря",
  ],
  en: [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ],
  uz: [
    "yanvar",
    "fevral",
    "mart",
    "aprel",
    "may",
    "iyun",
    "iyul",
    "avgust",
    "sentyabr",
    "oktyabr",
    "noyabr",
    "dekabr",
  ],
};
const ordinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

/**
 * «Каждый месяц, 10-го» / «Every month on the 10th» / «Har oy, 10-sanada».
 * Грамматика у языков разная, поэтому фраза собирается здесь, а не шаблоном словаря.
 */
export function describeSchedule(
  startDate: string,
  frequency: Frequency,
  interval: number,
  lang: "ru" | "en" | "uz" = "ru",
): string {
  const d = parseDate(startDate)!;
  const n = Math.max(1, interval);
  const wd = d.getDay();
  const day = getDate(d);
  const month = d.getMonth();
  const late = day >= 29;
  if (lang === "en") {
    if (frequency === "WEEKLY")
      return `${n === 1 ? "Every week" : `Every ${n} weeks`} on ${WEEKDAYS.en[wd]}`;
    if (frequency === "MONTHLY")
      return `${n === 1 ? "Every month" : `Every ${n} months`} on the ${ordinal(day)}${late ? " (or the last day of the month)" : ""}`;
    return `${n === 1 ? "Every year" : `Every ${n} years`} on ${MONTHS_GEN.en[month]} ${day}`;
  }
  if (lang === "uz") {
    if (frequency === "WEEKLY")
      return `${n === 1 ? "Har hafta" : `Har ${n} haftada`}, ${WEEKDAYS.uz[wd]} kunlari`;
    if (frequency === "MONTHLY")
      return `${n === 1 ? "Har oy" : `Har ${n} oyda`}, ${day}-sanada${late ? " (yoki oyning oxirgi kunida)" : ""}`;
    return `${n === 1 ? "Har yili" : `Har ${n} yilda`}, ${day}-${MONTHS_GEN.uz[month]}`;
  }
  if (frequency === "WEEKLY")
    return `${n === 1 ? "Каждую неделю" : `Каждые ${n} нед.`}, по ${WEEKDAYS.ru[wd]}`;
  if (frequency === "MONTHLY") {
    const when = late ? `${day}-го (или в последний день месяца)` : `${day}-го`;
    return `${n === 1 ? "Каждый месяц" : `Каждые ${n} мес.`}, ${when}`;
  }
  return `${n === 1 ? "Каждый год" : `Каждые ${n} г.`}, ${day} ${MONTHS_GEN.ru[month]}`;
}

/**
 * Повторения активных правил на ближайшие `days` дней (включая сегодня), по дате.
 * nextDate — следующее ещё не созданное повторение; дальше шагаем от него с тем же интервалом.
 */
export function upcomingOccurrences<
  R extends {
    active: boolean;
    nextDate: string;
    endDate: string | null;
    frequency: Frequency;
    interval: number;
  },
>(rules: R[], today: string, days = 14): { rule: R; date: string }[] {
  const until = format(addDays(parseDate(today)!, days), "yyyy-MM-dd");
  const out: { rule: R; date: string }[] = [];
  for (const r of rules) {
    if (!r.active) continue;
    for (let k = 0; k < 60; k++) {
      const d = occurrence(r.nextDate, r.frequency, r.interval, k);
      if (d > until || (r.endDate && d > r.endDate)) break;
      if (d >= today) out.push({ rule: r, date: d });
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}
