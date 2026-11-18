import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import { fromDateStr, toDateStr } from "@/lib/actions/utils";
import { todayIn } from "@/lib/period";
import { dueOccurrences } from "@/lib/recurring";

/**
 * Создаёт операции по регулярным правилам, у которых наступила дата (tasks.md 15.2).
 * Вызывается при каждом запросе пользователя (requireUser), один раз за запрос (React cache),
 * поэтому не нужен отдельный cron: пропущенные даты досоздаются при следующем визите.
 *
 * Защита от дублей: правило «захватывается» условным UPDATE ... WHERE count = <старое>.
 * Если параллельный запрос уже обработал правило, UPDATE вернёт 0 строк — и мы ничего не создаём.
 */
export const materializeRecurring = cache(
  async (userId: string, timezone: string): Promise<number> => {
    const today = todayIn(timezone);
    const due = await db.recurringRule.findMany({
      where: { userId, active: true, nextDate: { lte: fromDateStr(today) } },
    });
    let created = 0;
    for (const r of due) {
      const plan = dueOccurrences(
        {
          startDate: toDateStr(r.startDate),
          frequency: r.frequency,
          interval: r.interval,
          count: r.count,
          endDate: r.endDate ? toDateStr(r.endDate) : null,
        },
        today,
      );
      await db.$transaction(async (tx) => {
        const { count } = await tx.recurringRule.updateMany({
          where: { id: r.id, count: r.count },
          data: { count: plan.count, nextDate: fromDateStr(plan.nextDate), active: !plan.finished },
        });
        if (!count || plan.dates.length === 0) return;
        await tx.transaction.createMany({
          data: plan.dates.map((date) => ({
            userId,
            type: r.type,
            amount: r.amount,
            date: fromDateStr(date),
            note: r.note,
            categoryId: r.categoryId,
            walletId: r.walletId,
            recurringId: r.id,
          })),
        });
        created += plan.dates.length;
      });
    }
    return created;
  },
);
