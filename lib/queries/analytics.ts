import "server-only";
import { addDays, addMonths, format, startOfMonth, startOfWeek } from "date-fns";
import { ru } from "date-fns/locale";
import { db } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";
import { parseDate, type Granularity, type ResolvedPeriod } from "@/lib/period";

/** Все агрегации считаются в БД (SPEC.md §6). Даты — строки YYYY-MM-DD. */

const d = (s: string) => new Date(`${s}T00:00:00Z`);
const walletFilter = (walletId?: string) =>
  walletId ? Prisma.sql`AND t."walletId" = ${walletId}` : Prisma.empty;

export type Kpis = {
  income: number;
  expense: number;
  balance: number;
  prevIncome: number;
  prevExpense: number;
  prevBalance: number;
};

export async function getKpis(userId: string, p: ResolvedPeriod, walletId?: string): Promise<Kpis> {
  const [row] = await db.$queryRaw<
    {
      income: bigint | null;
      expense: bigint | null;
      prev_income: bigint | null;
      prev_expense: bigint | null;
      net_to: bigint | null;
      net_prev_to: bigint | null;
    }[]
  >`
    SELECT
      SUM(amount) FILTER (WHERE type = 'INCOME'  AND date BETWEEN ${d(p.from)} AND ${d(p.to)})        AS income,
      SUM(amount) FILTER (WHERE type = 'EXPENSE' AND date BETWEEN ${d(p.from)} AND ${d(p.to)})        AS expense,
      SUM(amount) FILTER (WHERE type = 'INCOME'  AND date BETWEEN ${d(p.prevFrom)} AND ${d(p.prevTo)}) AS prev_income,
      SUM(amount) FILTER (WHERE type = 'EXPENSE' AND date BETWEEN ${d(p.prevFrom)} AND ${d(p.prevTo)}) AS prev_expense,
      SUM(CASE WHEN type = 'INCOME' THEN amount ELSE -amount END) FILTER (WHERE date <= ${d(p.to)})     AS net_to,
      SUM(CASE WHEN type = 'INCOME' THEN amount ELSE -amount END) FILTER (WHERE date <= ${d(p.prevTo)}) AS net_prev_to
    FROM "transaction" t
    WHERE t."userId" = ${userId} AND t."deletedAt" IS NULL ${walletFilter(walletId)}`;
  const initial = await db.wallet.aggregate({
    where: { userId, ...(walletId ? { id: walletId } : { archived: false }) },
    _sum: { initialBalance: true },
  });
  const base = Number(initial._sum.initialBalance ?? 0);
  const n = (v: bigint | null) => Number(v ?? 0);
  return {
    income: n(row.income),
    expense: n(row.expense),
    balance: base + n(row.net_to),
    prevIncome: n(row.prev_income),
    prevExpense: n(row.prev_expense),
    prevBalance: base + n(row.net_prev_to),
  };
}

/** null — бакет в будущем: ось показывает весь период, но линии обрываются на сегодня. */
export type TrendPoint = {
  bucket: string;
  label: string;
  income: number | null;
  expense: number | null;
  balance: number | null;
};

const truncFn: Record<Granularity, (x: Date) => Date> = {
  day: (x) => x,
  week: (x) => startOfWeek(x, { weekStartsOn: 1 }),
  month: (x) => startOfMonth(x),
};
const stepFn: Record<Granularity, (x: Date) => Date> = {
  day: (x) => addDays(x, 1),
  week: (x) => addDays(x, 7),
  month: (x) => addMonths(x, 1),
};
const labelFn: Record<Granularity, (x: Date) => string> = {
  day: (x) => format(x, "d MMM", { locale: ru }),
  week: (x) => `с ${format(x, "d MMM", { locale: ru })}`,
  month: (x) => format(x, "LLL yyyy", { locale: ru }),
};

/** Динамика: доходы/расходы по бакетам + накопленный баланс на конец каждого бакета. */
export async function getTrend(
  userId: string,
  p: ResolvedPeriod,
  today: string,
  walletId?: string,
): Promise<TrendPoint[]> {
  const g = p.granularity;
  const [rows, opening, initial] = await Promise.all([
    db.$queryRaw<{ bucket: Date; income: bigint | null; expense: bigint | null }[]>`
      SELECT date_trunc(${g}, date)::date AS bucket,
             SUM(amount) FILTER (WHERE type = 'INCOME')  AS income,
             SUM(amount) FILTER (WHERE type = 'EXPENSE') AS expense
      FROM "transaction" t
      WHERE t."userId" = ${userId} AND t."deletedAt" IS NULL AND date BETWEEN ${d(p.from)} AND ${d(p.to)} ${walletFilter(walletId)}
      GROUP BY 1 ORDER BY 1`,
    db.$queryRaw<{ net: bigint | null }[]>`
      SELECT SUM(CASE WHEN type = 'INCOME' THEN amount ELSE -amount END) AS net
      FROM "transaction" t
      WHERE t."userId" = ${userId} AND t."deletedAt" IS NULL AND date < ${d(p.from)} ${walletFilter(walletId)}`,
    db.wallet.aggregate({
      where: { userId, ...(walletId ? { id: walletId } : { archived: false }) },
      _sum: { initialBalance: true },
    }),
  ]);

  const byBucket = new Map(rows.map((r) => [r.bucket.toISOString().slice(0, 10), r]));
  let balance = Number(initial._sum.initialBalance ?? 0) + Number(opening[0]?.net ?? 0);
  const out: TrendPoint[] = [];
  // Заполняем пустые бакеты нулями, чтобы на графике не было «дыр» (SPEC.md §6)
  for (let x = truncFn[g](parseDate(p.from)!); format(x, "yyyy-MM-dd") <= p.to; x = stepFn[g](x)) {
    const key = format(x, "yyyy-MM-dd");
    const r = byBucket.get(key);
    const income = Number(r?.income ?? 0);
    const expense = Number(r?.expense ?? 0);
    balance += income - expense;
    const future = key > today;
    out.push({
      bucket: key,
      label: labelFn[g](x),
      income: future ? null : income,
      expense: future ? null : expense,
      balance: future ? null : balance,
    });
  }
  return out;
}

export type CategorySlice = {
  id: string;
  name: string;
  icon: string;
  color: string;
  total: number;
  share: number;
};

/** Структура по категориям, крупнейшие сверху. Хвост длиннее maxSlices сворачивается в «Прочее». */
export async function getByCategory(
  userId: string,
  p: { from: string; to: string },
  type: "INCOME" | "EXPENSE",
  maxSlices = 5,
  walletId?: string,
) {
  const rows = await db.$queryRaw<
    { id: string; name: string; icon: string; color: string; total: bigint }[]
  >`
    SELECT c.id, c.name, c.icon, c.color, SUM(t.amount) AS total
    FROM "transaction" t JOIN category c ON c.id = t."categoryId"
    WHERE t."userId" = ${userId} AND t."deletedAt" IS NULL AND t.type = ${type}::"TxType"
      AND t.date BETWEEN ${d(p.from)} AND ${d(p.to)} ${walletFilter(walletId)}
    GROUP BY c.id ORDER BY total DESC`;
  const all = rows.map((r) => ({ ...r, total: Number(r.total) }));
  const sum = all.reduce((s, r) => s + r.total, 0);
  const head = all.length > maxSlices ? all.slice(0, maxSlices - 1) : all;
  const tail = all.slice(head.length);
  const slices: CategorySlice[] = head.map((r) => ({ ...r, share: sum ? r.total / sum : 0 }));
  if (tail.length) {
    const t = tail.reduce((s, r) => s + r.total, 0);
    slices.push({
      id: "other",
      name: `Прочее (${tail.length})`,
      icon: "CircleEllipsis",
      color: "slate",
      total: t,
      share: sum ? t / sum : 0,
    });
  }
  return { slices, total: sum, all: all.map((r) => ({ ...r, share: sum ? r.total / sum : 0 })) };
}

/* ───────────── Аналитика (tasks.md 10.1) ───────────── */

export type MonthPoint = { month: string; label: string; income: number; expense: number };

/** Доходы/расходы по месяцам: последние N месяцев, заканчивая месяцем `endDate`. */
export async function getMonthComparison(
  userId: string,
  endDate: string,
  months = 6,
): Promise<MonthPoint[]> {
  const end = startOfMonth(parseDate(endDate)!);
  const start = addMonths(end, -(months - 1));
  const rows = await db.$queryRaw<{ m: Date; income: bigint | null; expense: bigint | null }[]>`
    SELECT date_trunc('month', date)::date AS m,
           SUM(amount) FILTER (WHERE type = 'INCOME')  AS income,
           SUM(amount) FILTER (WHERE type = 'EXPENSE') AS expense
    FROM "transaction" t
    WHERE t."userId" = ${userId} AND t."deletedAt" IS NULL
      AND date >= ${d(format(start, "yyyy-MM-dd"))} AND date < ${d(format(addMonths(end, 1), "yyyy-MM-dd"))}
    GROUP BY 1`;
  const by = new Map(rows.map((r) => [r.m.toISOString().slice(0, 7), r]));
  return Array.from({ length: months }, (_, i) => {
    const m = addMonths(start, i);
    const key = format(m, "yyyy-MM");
    const r = by.get(key);
    return {
      month: key,
      label: format(m, "LLL yy", { locale: ru }).replace(".", ""),
      income: Number(r?.income ?? 0),
      expense: Number(r?.expense ?? 0),
    };
  });
}

/** Средний расход в день и самый дорогой день периода (дни считаются до сегодня). */
export async function getDailyStats(userId: string, p: ResolvedPeriod, today: string) {
  const to = p.to < today ? p.to : today;
  const [top] = await db.$queryRaw<{ date: Date; total: bigint }[]>`
    SELECT date, SUM(amount) AS total FROM "transaction" t
    WHERE t."userId" = ${userId} AND t."deletedAt" IS NULL AND type = 'EXPENSE' AND date BETWEEN ${d(p.from)} AND ${d(to)}
    GROUP BY date ORDER BY total DESC LIMIT 1`;
  const elapsed = Math.max(1, Math.round((d(to).getTime() - d(p.from).getTime()) / 86_400_000) + 1);
  return {
    elapsedDays: to < p.from ? 0 : elapsed,
    maxDay: top ? { date: top.date.toISOString().slice(0, 10), total: Number(top.total) } : null,
  };
}

/* ───────────── Бюджеты (tasks.md 11.1) ───────────── */

export type BudgetStatus = "ok" | "warning" | "over";
export type BudgetProgress = {
  id: string;
  categoryId: string;
  name: string;
  icon: string;
  color: string;
  limit: number;
  spent: number;
  pct: number;
  status: BudgetStatus;
};

export const budgetStatus = (pct: number): BudgetStatus =>
  pct > 1 ? "over" : pct >= 0.8 ? "warning" : "ok";

/** Прогресс бюджетов месяца (`month` — "YYYY-MM-01"). */
export async function getBudgetsProgress(
  userId: string,
  month: string,
  categoryId?: string,
): Promise<BudgetProgress[]> {
  const from = d(month);
  const to = d(format(addMonths(parseDate(month)!, 1), "yyyy-MM-dd"));
  const rows = await db.$queryRaw<
    {
      id: string;
      categoryId: string;
      name: string;
      icon: string;
      color: string;
      limit: bigint;
      spent: bigint | null;
    }[]
  >`
    SELECT b.id, b."categoryId", c.name, c.icon, c.color, b."limit",
           (SELECT SUM(t.amount) FROM "transaction" t
             WHERE t."userId" = b."userId" AND t."categoryId" = b."categoryId" AND t."deletedAt" IS NULL
               AND t.type = 'EXPENSE' AND t.date >= ${from} AND t.date < ${to}) AS spent
    FROM budget b JOIN category c ON c.id = b."categoryId"
    WHERE b."userId" = ${userId} AND b.month = ${from} ${categoryId ? Prisma.sql`AND b."categoryId" = ${categoryId}` : Prisma.empty}
    ORDER BY c."sortOrder", c.name`;
  return rows
    .map((r) => {
      const limit = Number(r.limit);
      const spent = Number(r.spent ?? 0);
      const pct = limit ? spent / limit : 0;
      return {
        id: r.id,
        categoryId: r.categoryId,
        name: r.name,
        icon: r.icon,
        color: r.color,
        limit,
        spent,
        pct,
        status: budgetStatus(pct),
      };
    })
    .sort((a, b) => b.pct - a.pct);
}
