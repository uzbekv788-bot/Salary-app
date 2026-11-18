import { differenceInCalendarMonths } from "date-fns";
import { parseDate } from "@/lib/period";

/**
 * Сколько откладывать в месяц, чтобы успеть к сроку (tasks.md 16.3).
 * Считаем оставшиеся месяцы, включая текущий: до 15 декабря из ноября — 2 месяца.
 */
export function monthlyNeeded(
  target: number,
  saved: number,
  deadline: string | null,
  today: string,
): { perMonth: number; months: number } | null {
  if (!deadline || saved >= target) return null;
  const months = Math.max(
    1,
    differenceInCalendarMonths(parseDate(deadline)!, parseDate(today)!) + 1,
  );
  return { perMonth: Math.ceil((target - saved) / months / 100) * 100, months };
}
