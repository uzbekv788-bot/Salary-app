/**
 * Демо-данные (tasks.md 3.5): пользователь demo@salary.app / demo12345
 * с двумя счетами, стандартными категориями и ~12 месяцами реалистичных операций.
 * Запуск: pnpm db:seed (идемпотентно — демо-пользователь пересоздаётся).
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "better-auth/crypto";
import { addDays, addMonths, getDay, startOfMonth, subMonths } from "date-fns";
import { PrismaClient, type TxType } from "../lib/generated/prisma/client";
import { DEFAULT_CATEGORIES } from "../lib/design/category-palette";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

export const DEMO_EMAIL = "demo@salary.app";
export const DEMO_PASSWORD = "demo12345";

// Детерминированный генератор случайных чисел, чтобы демо-данные были одинаковыми при каждом запуске
let seed = 42;
const rand = () => (seed = (seed * 1_664_525 + 1_013_904_223) % 2 ** 32) / 2 ** 32;
const between = (min: number, max: number) => Math.round(min + rand() * (max - min));
const rub = (major: number) => BigInt(Math.round(major) * 100);
const pick = <T>(xs: T[]) => xs[Math.floor(rand() * xs.length)];
/** Дата в UTC-полночь — так Postgres DATE не съезжает на день. */
const day = (d: Date) => new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));

async function main() {
  await db.user.deleteMany({ where: { email: DEMO_EMAIL } });

  const userId = randomUUID();
  await db.user.create({
    data: {
      id: userId,
      name: "Демо Пользователь",
      email: DEMO_EMAIL,
      emailVerified: true,
      onboarded: true,
      accounts: {
        create: {
          id: randomUUID(),
          accountId: userId,
          providerId: "credential",
          password: await hashPassword(DEMO_PASSWORD),
        },
      },
    },
  });

  const card = await db.wallet.create({
    data: { userId, name: "Карта", type: "CARD", initialBalance: rub(45_000) },
  });
  const cash = await db.wallet.create({
    data: { userId, name: "Наличные", type: "CASH", initialBalance: rub(60_000) },
  });

  const cats: Record<string, string> = {};
  for (const [i, c] of DEFAULT_CATEGORIES.entries()) {
    const created = await db.category.create({
      data: { userId, name: c.name, type: c.type, icon: c.icon, color: c.color, sortOrder: i },
    });
    cats[c.key] = created.id;
  }

  type Row = {
    type: TxType;
    key: string;
    amount: number;
    date: Date;
    note?: string;
    cash?: boolean;
  };
  const rows: Row[] = [];
  const today = new Date();
  const start = startOfMonth(subMonths(today, 11));

  for (let m = start; m <= today; m = addMonths(m, 1)) {
    const y = m.getFullYear();
    const mo = m.getMonth();
    const at = (d: number) => new Date(y, mo, d);
    const push = (r: Row) => r.date <= today && rows.push(r);

    // Доходы: зарплата дважды в месяц (аванс и расчёт), фриланс — иногда
    push({ type: "INCOME", key: "salary", amount: 80_000, date: at(10), note: "Аванс" });
    push({ type: "INCOME", key: "salary", amount: 105_000, date: at(25), note: "Зарплата" });
    if (rand() < 0.55)
      push({
        type: "INCOME",
        key: "freelance",
        amount: between(15_000, 60_000),
        date: at(between(3, 27)),
        note: "Проект",
      });
    if (mo === 11 || rand() < 0.08)
      push({
        type: "INCOME",
        key: "gifts-in",
        amount: between(3_000, 15_000),
        date: at(between(1, 28)),
      });
    if (rand() < 0.3)
      push({
        type: "INCOME",
        key: "invest",
        amount: between(1_500, 6_000),
        date: at(between(1, 28)),
        note: "Дивиденды",
      });

    // Регулярные расходы
    push({ type: "EXPENSE", key: "housing", amount: 38_000, date: at(1), note: "Аренда" });
    push({
      type: "EXPENSE",
      key: "housing",
      amount: between(4_500, 7_500),
      date: at(15),
      note: "ЖКХ",
    });
    push({ type: "EXPENSE", key: "subs", amount: 650, date: at(5), note: "Мобильная связь" });
    push({ type: "EXPENSE", key: "subs", amount: 399, date: at(12), note: "Музыка" });
    push({ type: "EXPENSE", key: "subs", amount: 599, date: at(18), note: "Интернет" });

    // Ежедневные траты
    const daysInMonth = new Date(y, mo + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const date = at(d);
      if (date > today) break;
      const weekend = [0, 6].includes(getDay(date));
      if (rand() < 0.45)
        push({
          type: "EXPENSE",
          key: "groceries",
          amount: between(600, weekend ? 4_500 : 2_200),
          date,
          note: pick(["Пятёрочка", "Перекрёсток", "ВкусВилл", "Рынок"]),
          cash: rand() < 0.15,
        });
      if (rand() < (weekend ? 0.5 : 0.22))
        push({
          type: "EXPENSE",
          key: "cafe",
          amount: between(350, weekend ? 3_800 : 1_200),
          date,
          note: pick(["Кофейня", "Обед", "Доставка", "Ресторан"]),
        });
      if (!weekend && rand() < 0.6)
        push({ type: "EXPENSE", key: "transport", amount: between(60, 180), date, note: "Метро" });
      if (rand() < 0.07)
        push({
          type: "EXPENSE",
          key: "transport",
          amount: between(350, 1_200),
          date,
          note: "Такси",
        });
      if (weekend && rand() < 0.25)
        push({
          type: "EXPENSE",
          key: "fun",
          amount: between(500, 3_500),
          date,
          note: pick(["Кино", "Концерт", "Игры", "Боулинг"]),
        });
    }
    if (rand() < 0.5)
      push({
        type: "EXPENSE",
        key: "health",
        amount: between(800, 6_000),
        date: at(between(1, 28)),
        note: pick(["Аптека", "Стоматолог", "Анализы"]),
      });
    if (rand() < 0.45 || mo === 8 || mo === 2)
      push({
        type: "EXPENSE",
        key: "clothes",
        amount: between(2_500, 14_000),
        date: at(between(1, 28)),
      });
    if (rand() < 0.3)
      push({
        type: "EXPENSE",
        key: "other-out",
        amount: between(300, 4_000),
        date: at(between(1, 28)),
      });
  }

  await db.transaction.createMany({
    data: rows.map((r) => ({
      userId,
      type: r.type,
      amount: rub(r.amount),
      date: day(r.date),
      note: r.note,
      categoryId: cats[r.key],
      walletId: r.cash ? cash.id : card.id,
    })),
  });

  // Бюджеты на текущий месяц: один в норме, один близко к лимиту, один превышен
  const month = day(startOfMonth(today));
  await db.budget.createMany({
    data: [
      { userId, categoryId: cats.groceries, month, limit: rub(25_000) },
      { userId, categoryId: cats.cafe, month, limit: rub(9_000) },
      { userId, categoryId: cats.fun, month, limit: rub(3_000) },
      { userId, categoryId: cats.transport, month, limit: rub(4_000) },
    ],
  });

  // Регулярные платежи (v1.1): следующее повторение — ближайшая дата после сегодня,
  // прошлые месяцы уже есть в операциях выше
  const nextOn = (dayOfMonth: number) => {
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), dayOfMonth);
    return day(thisMonth > today ? thisMonth : addMonths(thisMonth, 1));
  };
  const rules: { key: string; type: TxType; amount: number; dayOfMonth: number; note: string }[] = [
    { key: "salary", type: "INCOME", amount: 80_000, dayOfMonth: 10, note: "Аванс" },
    { key: "salary", type: "INCOME", amount: 105_000, dayOfMonth: 25, note: "Зарплата" },
    { key: "housing", type: "EXPENSE", amount: 38_000, dayOfMonth: 1, note: "Аренда" },
    { key: "subs", type: "EXPENSE", amount: 650, dayOfMonth: 5, note: "Мобильная связь" },
    { key: "subs", type: "EXPENSE", amount: 399, dayOfMonth: 12, note: "Музыка" },
    { key: "subs", type: "EXPENSE", amount: 599, dayOfMonth: 18, note: "Интернет" },
  ];
  await db.recurringRule.createMany({
    data: rules.map((r) => ({
      userId,
      type: r.type,
      amount: rub(r.amount),
      categoryId: cats[r.key],
      walletId: card.id,
      note: r.note,
      frequency: "MONTHLY" as const,
      interval: 1,
      startDate: nextOn(r.dayOfMonth),
      nextDate: nextOn(r.dayOfMonth),
      count: 0,
    })),
  });

  // Цели (v1.1): одна в процессе со сроком, одна долгосрочная, одна достигнутая
  const goal = async (
    name: string,
    icon: string,
    color: string,
    target: number,
    deadlineMonths: number | null,
    contributions: number[],
    completed = false,
  ) => {
    const g = await db.goal.create({
      data: {
        userId,
        name,
        icon,
        color,
        target: rub(target),
        deadline: deadlineMonths === null ? null : day(addMonths(today, deadlineMonths)),
        completedAt: completed ? new Date() : null,
      },
    });
    await db.goalContribution.createMany({
      data: contributions.map((amount, i) => ({
        goalId: g.id,
        userId,
        amount: rub(amount),
        date: day(subMonths(today, contributions.length - 1 - i)),
      })),
    });
  };
  await goal("Отпуск в Грузии", "Plane", "sky", 150_000, 6, [20_000, 15_000, 15_000, 10_000]);
  await goal(
    "Подушка безопасности",
    "Umbrella",
    "emerald",
    300_000,
    12,
    [100_000, 50_000, 30_000, 30_000],
  );
  await goal("Новый ноутбук", "Laptop", "violet", 120_000, null, [40_000, 40_000, 40_000], true);

  console.log(
    `✔ Демо-пользователь ${DEMO_EMAIL} / ${DEMO_PASSWORD}: ${rows.length} операций с ${day(start).toISOString().slice(0, 10)} по ${day(addDays(today, 0)).toISOString().slice(0, 10)}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
