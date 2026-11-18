import { format } from "date-fns";
import type { Format } from "@/lib/i18n/format";
import { parseDate } from "@/lib/period";

/** «Сегодня» / «Вчера» / «12 ноября, среда» — на языке интерфейса. */
export function dayLabel(
  date: string,
  today: string,
  { fmt, todayLabel, yesterdayLabel }: { fmt: Format; todayLabel: string; yesterdayLabel: string },
): string {
  if (date === today) return todayLabel;
  const t = parseDate(today)!;
  const y = new Date(t.getFullYear(), t.getMonth(), t.getDate() - 1);
  if (date === format(y, "yyyy-MM-dd")) return yesterdayLabel;
  return fmt.long(date, date.slice(0, 4) !== today.slice(0, 4));
}
