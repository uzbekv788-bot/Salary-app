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
