/**
 * Безопасность данных (tasks.md 13.2, PRD FR-12): пользователь A никак не может
 * прочитать или изменить данные пользователя B. Плюс проверка расчётов аналитики.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const current = vi.hoisted(() => ({ id: "" }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/session", () => ({
  requireUser: async () => ({
    id: current.id,
    name: "T",
    email: `${current.id}@t.dev`,
    image: null,
    currency: "RUB",
    timezone: "Europe/Moscow",
    onboarded: true,
  }),
}));

const { db } = await import("@/lib/db");
const actions = await import("@/lib/actions/finance");
const { listTransactions, listWallets } = await import("@/lib/queries/finance");
const { getKpis, getByCategory, getBudgetsProgress } = await import("@/lib/queries/analytics");
const { resolvePeriod } = await import("@/lib/period");

const PREFIX = `it-${Date.now()}`;
type Fixture = {
  userId: string;
  walletId: string;
  food: string;
  cafe: string;
  salary: string;
  txId: string;
};

async function makeUser(tag: string): Promise<Fixture> {
  const userId = `${PREFIX}-${tag}`;
  await db.user.create({
    data: { id: userId, name: tag, email: `${userId}@t.dev`, onboarded: true },
  });
  const wallet = await db.wallet.create({
    data: { userId, name: "Карта", initialBalance: 100_000n },
  });
  const mk = (name: string, type: "INCOME" | "EXPENSE") =>
    db.category.create({ data: { userId, name, type, icon: "Package", color: "sky" } });
  const [food, cafe, salary] = await Promise.all([
    mk("Продукты", "EXPENSE"),
    mk("Кафе", "EXPENSE"),
    mk("Зарплата", "INCOME"),
  ]);
  const d = (s: string) => new Date(`${s}T00:00:00Z`);
  await db.transaction.createMany({
    data: [
      {
        userId,
        walletId: wallet.id,
        categoryId: salary.id,
        type: "INCOME",
        amount: 10_000_000n,
        date: d("2026-10-10"),
      },
      {
        userId,
        walletId: wallet.id,
        categoryId: food.id,
        type: "EXPENSE",
        amount: 300_000n,
        date: d("2026-10-12"),
      },
      {
        userId,
        walletId: wallet.id,
        categoryId: salary.id,
        type: "INCOME",
        amount: 12_000_000n,
        date: d("2026-11-10"),
      },
      {
        userId,
        walletId: wallet.id,
        categoryId: food.id,
        type: "EXPENSE",
        amount: 450_000n,
        date: d("2026-11-11"),
      },
      {
        userId,
        walletId: wallet.id,
        categoryId: cafe.id,
        type: "EXPENSE",
        amount: 150_000n,
        date: d("2026-11-12"),
      },
    ],
  });
  const tx = await db.transaction.findFirstOrThrow({ where: { userId, categoryId: cafe.id } });
  return {
    userId,
    walletId: wallet.id,
    food: food.id,
    cafe: cafe.id,
    salary: salary.id,
    txId: tx.id,
  };
}

let A: Fixture;
let B: Fixture;

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

describe("изоляция данных между пользователями", () => {
  it("списки видят только свои операции и счета", async () => {
    const { items, total } = await listTransactions(A.userId, {});
    expect(total).toBe(5);
    expect(items.every((t) => t.walletId === A.walletId)).toBe(true);
    expect((await listWallets(A.userId)).map((w) => w.id)).toEqual([A.walletId]);
  });

  it("нельзя создать операцию в чужой категории или на чужом счёте", async () => {
    const base = { type: "EXPENSE" as const, amount: "100", date: "2026-11-15", note: "" };
    expect(
      (await actions.saveTransaction({ ...base, categoryId: B.food, walletId: A.walletId })).ok,
    ).toBe(false);
    expect(
      (await actions.saveTransaction({ ...base, categoryId: A.food, walletId: B.walletId })).ok,
    ).toBe(false);
  });

  it("нельзя изменить, удалить или восстановить чужую операцию", async () => {
    const r = await actions.saveTransaction(
      {
        type: "EXPENSE",
        amount: "1",
        categoryId: A.food,
        walletId: A.walletId,
        date: "2026-11-15",
      },
      B.txId,
    );
    expect(r.ok).toBe(false);
    expect((await actions.deleteTransaction(B.txId)).ok).toBe(false);
    const still = await db.transaction.findUniqueOrThrow({ where: { id: B.txId } });
    expect(still.deletedAt).toBeNull();
    expect(still.amount).toBe(150_000n);
  });

  it("нельзя трогать чужие категории, счета и бюджеты", async () => {
    expect(
      (
        await actions.saveCategory(
          { name: "Взлом", type: "EXPENSE", icon: "Package", color: "rose" },
          B.cafe,
        )
      ).ok,
    ).toBe(false);
    expect((await actions.setCategoryArchived(B.cafe, true)).ok).toBe(false);
    expect((await actions.deleteCategory(B.food, A.food)).ok).toBe(false);
    expect((await actions.setWalletArchived(B.walletId, true)).ok).toBe(false);
    expect(
      (await actions.upsertBudget({ categoryId: B.food, month: "2026-11-01", limit: "1000" })).ok,
    ).toBe(false);
    expect(await db.category.findUnique({ where: { id: B.cafe } })).toMatchObject({
      name: "Кафе",
      archived: false,
    });
  });
});

describe("правила домена", () => {
  it("тип категории должен совпадать с типом операции", async () => {
    const r = await actions.saveTransaction({
      type: "INCOME",
      amount: "100",
      categoryId: A.food,
      walletId: A.walletId,
      date: "2026-11-15",
    });
    expect(r.ok).toBe(false);
  });

  it("удаление/восстановление операции", async () => {
    const created = await actions.saveTransaction({
      type: "EXPENSE",
      amount: "99,90",
      categoryId: A.cafe,
      walletId: A.walletId,
      date: "2026-11-16",
      note: "тест",
    });
    expect(created.ok).toBe(true);
    const id = created.ok ? created.data.id : "";
    expect((await db.transaction.findUniqueOrThrow({ where: { id } })).amount).toBe(9_990n);
    await actions.deleteTransaction(id);
    expect((await listTransactions(A.userId, { q: "тест" })).total).toBe(0);
    await actions.restoreTransaction(id);
    expect((await listTransactions(A.userId, { q: "тест" })).total).toBe(1);
    await db.transaction.delete({ where: { id } });
  });

  it("категорию с операциями нельзя удалить без переноса", async () => {
    const tmp = await db.category.create({
      data: { userId: A.userId, name: "Временная", type: "EXPENSE", icon: "Package", color: "sky" },
    });
    await db.transaction.create({
      data: {
        userId: A.userId,
        walletId: A.walletId,
        categoryId: tmp.id,
        type: "EXPENSE",
        amount: 100n,
        date: new Date("2026-11-01T00:00:00Z"),
      },
    });
    expect((await actions.deleteCategory(tmp.id)).ok).toBe(false);
    expect((await actions.deleteCategory(tmp.id, A.salary)).ok).toBe(false); // другой тип
    expect((await actions.deleteCategory(tmp.id, A.food)).ok).toBe(true);
    expect(await db.transaction.count({ where: { userId: A.userId, categoryId: A.food } })).toBe(3);
    await db.transaction.deleteMany({
      where: { userId: A.userId, categoryId: A.food, amount: 100n },
    });
  });

  it("нельзя архивировать последний счёт", async () => {
    expect((await actions.setWalletArchived(A.walletId, true)).ok).toBe(false);
  });
});

describe("аналитика", () => {
  it("KPI месяца и сравнение с тем же числом дней прошлого месяца", async () => {
    const p = resolvePeriod({ period: "month", date: "2026-11-01" }, "2026-11-30");
    const k = await getKpis(A.userId, p);
    expect(k).toMatchObject({
      income: 12_000_000,
      expense: 600_000,
      prevIncome: 10_000_000,
      prevExpense: 300_000,
    });
    // 1 000 ₽ начального + (100 000 − 3 000) + (120 000 − 6 000)
    expect(k.balance).toBe(100_000 + 9_700_000 + 11_400_000);
  });

  it("структура расходов и прогресс бюджета", async () => {
    const byCat = await getByCategory(
      A.userId,
      { from: "2026-11-01", to: "2026-11-30" },
      "EXPENSE",
    );
    expect(byCat.total).toBe(600_000);
    expect(byCat.slices.map((s) => [s.name, s.share])).toEqual([
      ["Продукты", 0.75],
      ["Кафе", 0.25],
    ]);

    expect(
      (await actions.upsertBudget({ categoryId: A.salary, month: "2026-11-01", limit: "1000" })).ok,
    ).toBe(false); // только расходы
    expect(
      (await actions.upsertBudget({ categoryId: A.cafe, month: "2026-11-01", limit: "1 800" })).ok,
    ).toBe(true);
    const [b] = await getBudgetsProgress(A.userId, "2026-11-01");
    expect(b).toMatchObject({ name: "Кафе", limit: 180_000, spent: 150_000, status: "warning" });
  });
});
