"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { type ActionResult, fail, fromDateStr, fromZod, ok } from "@/lib/actions/utils";
import {
  budgetSchema,
  type BudgetInput,
  categorySchema,
  transactionSchema,
  walletSchema,
  type CategoryInput,
  type TransactionInput,
  type WalletInput,
} from "@/lib/validators/finance";
import { getBudgetsProgress, type BudgetProgress } from "@/lib/queries/analytics";
import { occurrence } from "@/lib/recurring";

const refresh = () => revalidatePath("/", "layout");

/* ───────────── Операции (tasks.md 8.2) ───────────── */

/** Проверяет, что категория и счёт принадлежат пользователю, и тип категории совпадает с типом операции. */
async function checkRefs(userId: string, categoryId: string, walletId: string, type: string) {
  const [category, wallet] = await Promise.all([
    db.category.findFirst({ where: { id: categoryId, userId }, select: { type: true } }),
    db.wallet.findFirst({ where: { id: walletId, userId }, select: { id: true } }),
  ]);
  if (!category) return fail("Категория не найдена", { categoryId: "Выберите категорию" });
  if (category.type !== type)
    return fail("Категория не подходит к типу операции", { categoryId: "Выберите категорию" });
  if (!wallet) return fail("Счёт не найден", { walletId: "Выберите счёт" });
  return null;
}

type SavedTx = {
  id: string;
  budget: Pick<BudgetProgress, "name" | "pct" | "status" | "limit" | "spent"> | null;
};

/** Бюджет категории за месяц операции — чтобы предупредить после расхода (tasks.md 11.3). */
async function budgetAfter(userId: string, type: string, categoryId: string, date: string) {
  if (type !== "EXPENSE") return null;
  const [b] = await getBudgetsProgress(userId, `${date.slice(0, 7)}-01`, categoryId);
  return b && b.status !== "ok"
    ? { name: b.name, pct: b.pct, status: b.status, limit: b.limit, spent: b.spent }
    : null;
}

export async function saveTransaction(
  input: TransactionInput,
  id?: string,
  /** Только для новой операции: сделать её первым повторением регулярного правила */
  repeat?: "WEEKLY" | "MONTHLY" | "YEARLY",
): Promise<ActionResult<SavedTx>> {
  const user = await requireUser();
  const parsed = transactionSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const { amount, date, clientId, ...rest } = parsed.data;

  // Повторная отправка из офлайн-очереди: операция уже сохранена — не создаём дубль
  if (!id && clientId) {
    const existing = await db.transaction.findUnique({
      where: { userId_clientId: { userId: user.id, clientId } },
      select: { id: true },
    });
    if (existing) return ok({ id: existing.id, budget: null });
  }

  const refError = await checkRefs(user.id, rest.categoryId, rest.walletId, rest.type);
  if (refError) return refError;

  const data = { ...rest, amount: BigInt(amount), date: fromDateStr(date) };
  if (id) {
    const { count } = await db.transaction.updateMany({
      where: { id, userId: user.id, deletedAt: null },
      data,
    });
    if (!count) return fail("Операция не найдена");
    refresh();
    return ok({ id, budget: await budgetAfter(user.id, rest.type, rest.categoryId, date) });
  }
  let recurringId: string | null = null;
  if (repeat && ["WEEKLY", "MONTHLY", "YEARLY"].includes(repeat)) {
    const rule = await db.recurringRule.create({
      data: {
        userId: user.id,
        type: rest.type,
        amount: data.amount,
        categoryId: rest.categoryId,
        walletId: rest.walletId,
        note: rest.note,
        frequency: repeat,
        interval: 1,
        startDate: data.date,
        // Эта операция — повторение №0, следующее считается от той же даты
        count: 1,
        nextDate: fromDateStr(occurrence(date, repeat, 1, 1)),
      },
      select: { id: true },
    });
    recurringId = rule.id;
  }
  let created: { id: string };
  try {
    created = await db.transaction.create({
      data: { ...data, userId: user.id, recurringId, clientId: clientId ?? null },
      select: { id: true },
    });
  } catch (e) {
    // Две отправки одной офлайн-операции одновременно: вторая упирается в уникальный ключ
    if (clientId && (e as { code?: string }).code === "P2002") {
      if (recurringId) await db.recurringRule.delete({ where: { id: recurringId } });
      const existing = await db.transaction.findUniqueOrThrow({
        where: { userId_clientId: { userId: user.id, clientId } },
        select: { id: true },
      });
      return ok({ id: existing.id, budget: null });
    }
    throw e;
  }
  refresh();
  return ok({
    id: created.id,
    budget: await budgetAfter(user.id, rest.type, rest.categoryId, date),
  });
}

/** Мягкое удаление — можно отменить (PRD FR-5). */
export async function deleteTransaction(id: string): Promise<ActionResult<undefined>> {
  const user = await requireUser();
  const { count } = await db.transaction.updateMany({
    where: { id, userId: user.id, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  if (!count) return fail("Операция не найдена");
  refresh();
  return ok(undefined);
}

export async function restoreTransaction(id: string): Promise<ActionResult<undefined>> {
  const user = await requireUser();
  const { count } = await db.transaction.updateMany({
    where: { id, userId: user.id, deletedAt: { not: null } },
    data: { deletedAt: null },
  });
  if (!count) return fail("Операцию уже нельзя восстановить");
  refresh();
  return ok(undefined);
}

/* ───────────── Категории (tasks.md 7.2) ───────────── */

export async function saveCategory(
  input: CategoryInput,
  id?: string,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const { name, type } = parsed.data;

  const duplicate = await db.category.findFirst({
    where: {
      userId: user.id,
      type,
      name: { equals: name, mode: "insensitive" },
      NOT: id ? { id } : undefined,
    },
  });
  if (duplicate) return fail("Такая категория уже есть", { name: "Такая категория уже есть" });

  if (id) {
    const existing = await db.category.findFirst({
      where: { id, userId: user.id },
      select: { type: true },
    });
    if (!existing) return fail("Категория не найдена");
    // Тип менять нельзя: в категории уже могут быть операции другого типа
    await db.category.update({ where: { id }, data: { ...parsed.data, type: existing.type } });
    refresh();
    return ok({ id });
  }
  const max = await db.category.aggregate({
    where: { userId: user.id, type },
    _max: { sortOrder: true },
  });
  const created = await db.category.create({
    data: { ...parsed.data, userId: user.id, sortOrder: (max._max.sortOrder ?? 0) + 1 },
    select: { id: true },
  });
  refresh();
  return ok(created);
}

export async function setCategoryArchived(
  id: string,
  archived: boolean,
): Promise<ActionResult<undefined>> {
  const user = await requireUser();
  const { count } = await db.category.updateMany({
    where: { id, userId: user.id },
    data: { archived },
  });
  if (!count) return fail("Категория не найдена");
  refresh();
  return ok(undefined);
}

/**
 * Удаление категории (PRD FR-6). Если в ней есть операции — их нужно перенести
 * в другую категорию того же типа (moveToId), иначе удалить нельзя.
 */
export async function deleteCategory(
  id: string,
  moveToId?: string,
): Promise<ActionResult<undefined>> {
  const user = await requireUser();
  const category = await db.category.findFirst({
    where: { id, userId: user.id },
    select: { type: true },
  });
  if (!category) return fail("Категория не найдена");
  // Регулярные правила тоже «используют» категорию: без переноса они удалились бы молча
  const [txCount, ruleCount] = await Promise.all([
    db.transaction.count({ where: { categoryId: id } }),
    db.recurringRule.count({ where: { categoryId: id } }),
  ]);
  const used = txCount + ruleCount;

  if (used > 0) {
    if (!moveToId || moveToId === id)
      return fail("В категории есть операции или регулярные платежи — выберите, куда их перенести");
    const target = await db.category.findFirst({
      where: { id: moveToId, userId: user.id, type: category.type },
    });
    if (!target) return fail("Категория для переноса не найдена");
    await db.$transaction([
      db.transaction.updateMany({
        where: { categoryId: id, userId: user.id },
        data: { categoryId: moveToId },
      }),
      db.recurringRule.updateMany({
        where: { categoryId: id, userId: user.id },
        data: { categoryId: moveToId },
      }),
      db.budget.deleteMany({ where: { categoryId: id, userId: user.id } }),
      db.category.delete({ where: { id } }),
    ]);
  } else {
    await db.category.delete({ where: { id } });
  }
  refresh();
  return ok(undefined);
}

/* ───────────── Счета (tasks.md 7.5) ───────────── */

export async function saveWallet(
  input: WalletInput,
  id?: string,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const parsed = walletSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const data = { ...parsed.data, initialBalance: BigInt(parsed.data.initialBalance) };
  if (id) {
    const { count } = await db.wallet.updateMany({ where: { id, userId: user.id }, data });
    if (!count) return fail("Счёт не найден");
    refresh();
    return ok({ id });
  }
  const created = await db.wallet.create({
    data: { ...data, userId: user.id },
    select: { id: true },
  });
  refresh();
  return ok(created);
}

export async function setWalletArchived(
  id: string,
  archived: boolean,
): Promise<ActionResult<undefined>> {
  const user = await requireUser();
  if (archived) {
    const active = await db.wallet.count({ where: { userId: user.id, archived: false } });
    if (active <= 1) return fail("Нужен хотя бы один активный счёт");
  }
  const { count } = await db.wallet.updateMany({
    where: { id, userId: user.id },
    data: { archived },
  });
  if (!count) return fail("Счёт не найден");
  refresh();
  return ok(undefined);
}

/* ───────────── Бюджеты (tasks.md 11.1) ───────────── */

export async function upsertBudget(input: BudgetInput): Promise<ActionResult<undefined>> {
  const user = await requireUser();
  const parsed = budgetSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const { categoryId, month, limit } = parsed.data;
  const category = await db.category.findFirst({
    where: { id: categoryId, userId: user.id, type: "EXPENSE" },
  });
  if (!category)
    return fail("Бюджет можно задать только для категории расходов", {
      categoryId: "Выберите категорию",
    });
  const monthDate = fromDateStr(month);
  await db.budget.upsert({
    where: { userId_categoryId_month: { userId: user.id, categoryId, month: monthDate } },
    create: { userId: user.id, categoryId, month: monthDate, limit: BigInt(limit) },
    update: { limit: BigInt(limit) },
  });
  refresh();
  return ok(undefined);
}

export async function deleteBudget(id: string): Promise<ActionResult<undefined>> {
  const user = await requireUser();
  const { count } = await db.budget.deleteMany({ where: { id, userId: user.id } });
  if (!count) return fail("Бюджет не найден");
  refresh();
  return ok(undefined);
}

/** Скопировать лимиты прошлого месяца в текущий (если их там ещё нет). */
export async function copyBudgetsFromPrevious(
  month: string,
): Promise<ActionResult<{ copied: number }>> {
  const user = await requireUser();
  if (!/^\d{4}-\d{2}-01$/.test(month)) return fail("Некорректный месяц");
  const cur = fromDateStr(month);
  const prev = new Date(Date.UTC(cur.getUTCFullYear(), cur.getUTCMonth() - 1, 1));
  const prevBudgets = await db.budget.findMany({ where: { userId: user.id, month: prev } });
  const { count } = await db.budget.createMany({
    data: prevBudgets.map((b) => ({
      userId: user.id,
      categoryId: b.categoryId,
      month: cur,
      limit: b.limit,
    })),
    skipDuplicates: true,
  });
  refresh();
  return ok({ copied: count });
}
