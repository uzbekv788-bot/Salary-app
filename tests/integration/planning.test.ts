/** Регулярные платежи и цели (tasks.md 15–16): создание операций без дублей, пауза, цели, изоляция. */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { addMonths, format, subMonths } from "date-fns";

const current = vi.hoisted(() => ({ id: "" }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/session", () => ({
  requireUser: async () => ({
    id: current.id,
    name: "T",
    email: `${current.id}@t.dev`,
    image: null,
    currency: "RUB",
    timezone: "UTC",
    onboarded: true,
  }),
}));

const { db } = await import("@/lib/db");
const planning = await import("@/lib/actions/planning");
const finance = await import("@/lib/actions/finance");
const { materializeRecurring } = await import("@/lib/recurring-server");
const { todayIn } = await import("@/lib/period");

const PREFIX = `pl-${Date.now()}`;
const today = todayIn("UTC");
const ymd = (d: Date) => format(d, "yyyy-MM-dd");
const T = new Date(`${today}T00:00:00`);
type U = { userId: string; walletId: string; rent: string; food: string; salary: string };

async function makeUser(tag: string): Promise<U> {
  const userId = `${PREFIX}-${tag}`;
  await db.user.create({
    data: { id: userId, name: tag, email: `${userId}@t.dev`, onboarded: true },
  });
  const w = await db.wallet.create({ data: { userId, name: "Карта" } });
  const mk = (name: string, type: "INCOME" | "EXPENSE") =>
    db.category.create({ data: { userId, name, type, icon: "Package", color: "sky" } });
  const [rent, food, salary] = await Promise.all([
    mk("Аренда", "EXPENSE"),
    mk("Продукты", "EXPENSE"),
    mk("Зарплата", "INCOME"),
  ]);
  return { userId, walletId: w.id, rent: rent.id, food: food.id, salary: salary.id };
}

let A: U;
let B: U;
beforeAll(async () => {
  A = await makeUser("a");
  B = await makeUser("b");
});
beforeEach(() => {
  current.id = A.userId;
});
afterAll(async () => {
  await db.transaction.deleteMany({ where: { userId: { startsWith: PREFIX } } });
  await db.user.deleteMany({ where: { id: { startsWith: PREFIX } } });
  await db.$disconnect();
});

const txCount = (recurringId: string) => db.transaction.count({ where: { recurringId } });

describe("регулярные платежи", () => {
  it("досоздаёт пропущенные даты ровно один раз, даже при параллельных запросах", async () => {
    const start = ymd(subMonths(T, 3));
    const r = await planning.saveRecurring({
      type: "EXPENSE",
      amount: "38 000",
      categoryId: A.rent,
      walletId: A.walletId,
      frequency: "MONTHLY",
      interval: 1,
      nextDate: start,
      note: "Аренда",
    });
    expect(r.ok).toBe(true);
    const id = r.ok ? r.data.id : "";

    // Три «одновременных запроса» — операции должны появиться один раз: 3 месяца назад … сегодня = 4 шт.
    const created = await Promise.all([1, 2, 3].map(() => materializeRecurring(A.userId, "UTC")));
    expect(created.reduce((a, b) => a + b, 0)).toBe(4);
    expect(await txCount(id)).toBe(4);
    expect(await materializeRecurring(A.userId, "UTC")).toBe(0);

    const rule = await db.recurringRule.findUniqueOrThrow({ where: { id } });
    expect(ymd(rule.nextDate)).toBe(ymd(addMonths(subMonths(T, 3), 4)));
    const tx = await db.transaction.findFirstOrThrow({ where: { recurringId: id } });
    expect(tx).toMatchObject({
      amount: 3_800_000n,
      note: "Аренда",
      type: "EXPENSE",
      walletId: A.walletId,
    });
  });

  it("«Повторять» в форме: операция становится первым повторением, следующее — через месяц", async () => {
    const date = ymd(subMonths(T, 2));
    const r = await finance.saveTransaction(
      { type: "INCOME", amount: "100000", categoryId: A.salary, walletId: A.walletId, date },
      undefined,
      "MONTHLY",
    );
    expect(r.ok).toBe(true);
    const tx = await db.transaction.findUniqueOrThrow({ where: { id: r.ok ? r.data.id : "" } });
    expect(tx.recurringId).not.toBeNull();
    const rule = await db.recurringRule.findUniqueOrThrow({ where: { id: tx.recurringId! } });
    expect({ count: rule.count, next: ymd(rule.nextDate) }).toEqual({
      count: 1,
      next: ymd(addMonths(subMonths(T, 2), 1)),
    });
    await materializeRecurring(A.userId, "UTC");
    expect(await txCount(rule.id)).toBe(3); // исходная + 2 пропущенных месяца
  });

  it("после паузы пропущенные даты не создаются", async () => {
    const r = await planning.saveRecurring({
      type: "EXPENSE",
      amount: "500",
      categoryId: A.food,
      walletId: A.walletId,
      frequency: "WEEKLY",
      interval: 1,
      nextDate: today,
    });
    const id = r.ok ? r.data.id : "";
    await materializeRecurring(A.userId, "UTC");
    expect(await txCount(id)).toBe(1);
    await planning.setRecurringActive(id, false);
    // Имитируем долгую паузу: правило «застряло» на дате 5 недель назад
    await db.recurringRule.update({
      where: { id },
      data: {
        startDate: new Date(`${ymd(subMonths(T, 2))}T00:00:00Z`),
        count: 1,
        nextDate: new Date(`${ymd(subMonths(T, 2))}T00:00:00Z`),
      },
    });
    expect((await planning.setRecurringActive(id, true)).ok).toBe(true);
    const rule = await db.recurringRule.findUniqueOrThrow({ where: { id } });
    expect(ymd(rule.nextDate) >= today).toBe(true);
    await materializeRecurring(A.userId, "UTC");
    expect(await txCount(id)).toBeLessThanOrEqual(2);
  });

  it("удаление правила оставляет созданные операции", async () => {
    const r = await planning.saveRecurring({
      type: "EXPENSE",
      amount: "100",
      categoryId: A.food,
      walletId: A.walletId,
      frequency: "MONTHLY",
      interval: 1,
      nextDate: today,
      note: "удаляемое",
    });
    const id = r.ok ? r.data.id : "";
    await materializeRecurring(A.userId, "UTC");
    expect((await planning.deleteRecurring(id)).ok).toBe(true);
    const tx = await db.transaction.findFirstOrThrow({
      where: { userId: A.userId, note: "удаляемое" },
    });
    expect(tx.recurringId).toBeNull();
  });

  it("категорию с регулярным платежом нельзя удалить без переноса; при переносе правило переезжает", async () => {
    const cat = await db.category.create({
      data: { userId: A.userId, name: "Подписки", type: "EXPENSE", icon: "Tv", color: "rose" },
    });
    const r = await planning.saveRecurring({
      type: "EXPENSE",
      amount: "399",
      categoryId: cat.id,
      walletId: A.walletId,
      frequency: "MONTHLY",
      interval: 1,
      nextDate: ymd(addMonths(T, 1)),
    });
    expect((await finance.deleteCategory(cat.id)).ok).toBe(false);
    expect((await finance.deleteCategory(cat.id, A.food)).ok).toBe(true);
    expect(
      (await db.recurringRule.findUniqueOrThrow({ where: { id: r.ok ? r.data.id : "" } }))
        .categoryId,
    ).toBe(A.food);
  });

  it("тип категории должен совпадать, дата окончания — не раньше начала", async () => {
    const base = {
      amount: "1",
      walletId: A.walletId,
      frequency: "MONTHLY" as const,
      interval: 1,
      nextDate: today,
    };
    expect((await planning.saveRecurring({ ...base, type: "INCOME", categoryId: A.food })).ok).toBe(
      false,
    );
    expect(
      (
        await planning.saveRecurring({
          ...base,
          type: "EXPENSE",
          categoryId: A.food,
          endDate: ymd(subMonths(T, 1)),
        })
      ).ok,
    ).toBe(false);
  });
});

describe("цели", () => {
  it("пополнения, снятия и достижение цели", async () => {
    const g = await planning.saveGoal({
      name: "Отпуск",
      icon: "Plane",
      color: "sky",
      target: "1000",
    });
    const goalId = g.ok ? g.data.id : "";
    const add = (direction: "IN" | "OUT", amount: string) =>
      planning.addContribution({ goalId, direction, amount, date: today });

    expect(await add("IN", "600")).toMatchObject({
      ok: true,
      data: { saved: 60_000, justCompleted: false },
    });
    expect((await add("OUT", "700")).ok).toBe(false); // больше, чем накоплено
    expect(await add("IN", "400")).toMatchObject({
      ok: true,
      data: { saved: 100_000, justCompleted: true },
    });
    expect((await db.goal.findUniqueOrThrow({ where: { id: goalId } })).completedAt).not.toBeNull();
    expect(await add("OUT", "1")).toMatchObject({ ok: true, data: { justCompleted: false } });
    expect((await db.goal.findUniqueOrThrow({ where: { id: goalId } })).completedAt).toBeNull();
  });
});

describe("изоляция новых данных между пользователями", () => {
  it("нельзя читать или менять чужие правила и цели", async () => {
    current.id = B.userId;
    const rule = await planning.saveRecurring({
      type: "EXPENSE",
      amount: "1",
      categoryId: B.food,
      walletId: B.walletId,
      frequency: "MONTHLY",
      interval: 1,
      nextDate: ymd(addMonths(T, 1)),
    });
    const goal = await planning.saveGoal({
      name: "Чужая",
      icon: "Gift",
      color: "rose",
      target: "100",
    });
    current.id = A.userId;
    const ruleId = rule.ok ? rule.data.id : "";
    const goalId = goal.ok ? goal.data.id : "";

    expect(
      (
        await planning.saveRecurring({
          type: "EXPENSE",
          amount: "1",
          categoryId: B.food,
          walletId: A.walletId,
          frequency: "MONTHLY",
          interval: 1,
          nextDate: today,
        })
      ).ok,
    ).toBe(false);
    expect(
      (
        await planning.saveRecurring(
          {
            type: "EXPENSE",
            amount: "1",
            categoryId: A.food,
            walletId: A.walletId,
            frequency: "MONTHLY",
            interval: 1,
            nextDate: today,
          },
          ruleId,
        )
      ).ok,
    ).toBe(false);
    expect((await planning.setRecurringActive(ruleId, false)).ok).toBe(false);
    expect((await planning.deleteRecurring(ruleId)).ok).toBe(false);
    expect(
      (await planning.addContribution({ goalId, direction: "IN", amount: "10", date: today })).ok,
    ).toBe(false);
    expect(
      (await planning.saveGoal({ name: "x", icon: "Gift", color: "rose", target: "1" }, goalId)).ok,
    ).toBe(false);
    expect((await planning.deleteGoal(goalId)).ok).toBe(false);

    // A при материализации не трогает правила B
    await materializeRecurring(A.userId, "UTC");
    expect(await db.recurringRule.findUniqueOrThrow({ where: { id: ruleId } })).toMatchObject({
      active: true,
      count: 0,
    });
    expect(await db.goalContribution.count({ where: { goalId } })).toBe(0);
  });
});
