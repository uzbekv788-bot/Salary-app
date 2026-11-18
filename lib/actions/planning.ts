"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { type ActionResult, fail, fromDateStr, fromZod, ok, toDateStr } from "@/lib/actions/utils";
import { todayIn } from "@/lib/period";
import { occurrence } from "@/lib/recurring";
import {
  contributionSchema,
  goalSchema,
  recurringSchema,
  type ContributionInput,
  type GoalInput,
  type RecurringInput,
} from "@/lib/validators/finance";

const refresh = () => revalidatePath("/", "layout");

/* ───────────── Регулярные операции (tasks.md 15) ───────────── */

export async function saveRecurring(
  input: RecurringInput,
  id?: string,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const parsed = recurringSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const { amount, nextDate, endDate, ...rest } = parsed.data;

  const [category, wallet] = await Promise.all([
    db.category.findFirst({
      where: { id: rest.categoryId, userId: user.id },
      select: { type: true },
    }),
    db.wallet.findFirst({ where: { id: rest.walletId, userId: user.id }, select: { id: true } }),
  ]);
  if (!category || category.type !== rest.type)
    return fail("v.category", { categoryId: "v.category" });
  if (!wallet) return fail("err.walletNotFound", { walletId: "v.wallet" });

  const data = { ...rest, amount: BigInt(amount), endDate: endDate ? fromDateStr(endDate) : null };
  if (id) {
    const existing = await db.recurringRule.findFirst({ where: { id, userId: user.id } });
    if (!existing) return fail("err.ruleNotFound");
    const scheduleChanged =
      existing.frequency !== rest.frequency ||
      existing.interval !== rest.interval ||
      toDateStr(existing.nextDate) !== nextDate;
    // Изменили расписание — отсчитываем повторения заново от новой «следующей даты».
    // Уже созданные операции не трогаем: изменения действуют только на будущее.
    await db.recurringRule.update({
      where: { id },
      data: {
        ...data,
        ...(scheduleChanged && {
          startDate: fromDateStr(nextDate),
          nextDate: fromDateStr(nextDate),
          count: 0,
        }),
        active: existing.active && !(endDate && endDate < nextDate),
      },
    });
    refresh();
    return ok({ id });
  }
  const created = await db.recurringRule.create({
    data: {
      ...data,
      userId: user.id,
      startDate: fromDateStr(nextDate),
      nextDate: fromDateStr(nextDate),
      count: 0,
    },
    select: { id: true },
  });
  refresh();
  return ok(created);
}

/**
 * Пауза/возобновление. При возобновлении пропущенные за паузу даты НЕ создаются —
 * следующей становится ближайшая дата начиная с сегодня.
 */
export async function setRecurringActive(
  id: string,
  active: boolean,
): Promise<ActionResult<undefined>> {
  const user = await requireUser();
  const r = await db.recurringRule.findFirst({ where: { id, userId: user.id } });
  if (!r) return fail("err.ruleNotFound");
  if (!active) {
    await db.recurringRule.update({ where: { id }, data: { active: false } });
  } else {
    const today = todayIn(user.timezone);
    const start = toDateStr(r.startDate);
    let k = r.count;
    while (occurrence(start, r.frequency, r.interval, k) < today && k < r.count + 10_000) k++;
    const next = occurrence(start, r.frequency, r.interval, k);
    if (r.endDate && next > toDateStr(r.endDate)) return fail("err.ruleEnded");
    await db.recurringRule.update({
      where: { id },
      data: { active: true, count: k, nextDate: fromDateStr(next) },
    });
  }
  refresh();
  return ok(undefined);
}

/** Удаляет правило; уже созданные им операции остаются в истории. */
export async function deleteRecurring(id: string): Promise<ActionResult<undefined>> {
  const user = await requireUser();
  const { count } = await db.recurringRule.deleteMany({ where: { id, userId: user.id } });
  if (!count) return fail("err.ruleNotFound");
  refresh();
  return ok(undefined);
}

/* ───────────── Цели (tasks.md 16) ───────────── */

export async function saveGoal(
  input: GoalInput,
  id?: string,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const parsed = goalSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const { target, deadline, ...rest } = parsed.data;
  const data = {
    ...rest,
    target: BigInt(target),
    deadline: deadline ? fromDateStr(deadline) : null,
  };
  if (id) {
    const goal = await db.goal.findFirst({
      where: { id, userId: user.id },
      include: { contributions: { select: { amount: true } } },
    });
    if (!goal) return fail("err.goalNotFound");
    const saved = goal.contributions.reduce((s, c) => s + c.amount, 0n);
    await db.goal.update({
      where: { id },
      data: {
        ...data,
        completedAt: saved >= BigInt(target) ? (goal.completedAt ?? new Date()) : null,
      },
    });
    refresh();
    return ok({ id });
  }
  const created = await db.goal.create({
    data: { ...data, userId: user.id },
    select: { id: true },
  });
  refresh();
  return ok(created);
}

export async function deleteGoal(id: string): Promise<ActionResult<undefined>> {
  const user = await requireUser();
  const { count } = await db.goal.deleteMany({ where: { id, userId: user.id } });
  if (!count) return fail("err.goalNotFound");
  refresh();
  return ok(undefined);
}

/** Пополнение или снятие. Возвращает, достигнута ли цель этим пополнением (для поздравления). */
export async function addContribution(
  input: ContributionInput,
): Promise<ActionResult<{ saved: number; justCompleted: boolean }>> {
  const user = await requireUser();
  const parsed = contributionSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const { goalId, direction, amount, date, note } = parsed.data;

  return db.$transaction(async (tx) => {
    const goal = await tx.goal.findFirst({
      where: { id: goalId, userId: user.id },
      include: { contributions: { select: { amount: true } } },
    });
    if (!goal) return fail("err.goalNotFound");
    const before = goal.contributions.reduce((s, c) => s + c.amount, 0n);
    const delta = direction === "IN" ? BigInt(amount) : -BigInt(amount);
    if (before + delta < 0n) return fail("err.withdrawTooMuch", { amount: "err.moreThanSaved" });
    await tx.goalContribution.create({
      data: { goalId, userId: user.id, amount: delta, date: fromDateStr(date), note },
    });
    const after = before + delta;
    const reached = after >= goal.target;
    const justCompleted = reached && !goal.completedAt;
    if (justCompleted || (!reached && goal.completedAt)) {
      await tx.goal.update({
        where: { id: goalId },
        data: { completedAt: reached ? new Date() : null },
      });
    }
    refresh();
    return ok({ saved: Number(after), justCompleted });
  });
}
