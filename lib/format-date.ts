import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { parseDate } from "@/lib/period";

/** "Сегодня" / "Вчера" / "12 ноября, среда" */
export function dayLabel(date: string, today: string): string {
  if (date === today) return "Сегодня";
  const t = parseDate(today)!;
  const y = new Date(t.getFullYear(), t.getMonth(), t.getDate() - 1);
  if (date === format(y, "yyyy-MM-dd")) return "Вчера";
  const d = parseDate(date)!;
  return format(d, d.getFullYear() === t.getFullYear() ? "d MMMM, EEEE" : "d MMMM yyyy, EEEE", {
    locale: ru,
  });
}

export const shortDate = (date: string) => format(parseDate(date)!, "d MMM", { locale: ru });
