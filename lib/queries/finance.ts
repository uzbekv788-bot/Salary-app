import "server-only";
import { db } from "@/lib/db";
import { toDateStr } from "@/lib/actions/utils";
import type { Prisma } from "@/lib/generated/prisma/client";

export type CategoryDTO = {
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE";
  icon: string;
  color: string;
  archived: boolean;
  txCount: number;
};
export type WalletDTO = {
  id: string;
  name: string;
  type: "CARD" | "CASH" | "SAVINGS" | "OTHER";
  archived: boolean;
  initialBalance: number;
  balance: number;
};
export type TransactionDTO = {
  id: string;
  type: "INCOME" | "EXPENSE";
  amount: number;
  date: string;
  note: string | null;
  categoryId: string;
  walletId: string;
  category: { name: string; icon: string; color: string };
  wallet: { name: string };
};

export async function listCategories(
  userId: string,
  { includeArchived = false } = {},
): Promise<CategoryDTO[]> {
  const rows = await db.category.findMany({
    where: { userId, ...(includeArchived ? {} : { archived: false }) },
    orderBy: [{ archived: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { transactions: { where: { deletedAt: null } } } } },
  });
  return rows.map((c) => ({
    id: c.id,
    name: c.name,
    type: c.type,
    icon: c.icon,
    color: c.color,
    archived: c.archived,
    txCount: c._count.transactions,
  }));
}

/** Счета с текущим балансом: начальный + доходы − расходы (SPEC.md §3). */
export async function listWallets(
  userId: string,
  { includeArchived = false } = {},
): Promise<WalletDTO[]> {
  const [wallets, sums] = await Promise.all([
    db.wallet.findMany({
      where: { userId, ...(includeArchived ? {} : { archived: false }) },
      orderBy: [{ archived: "asc" }, { createdAt: "asc" }],
    }),
    db.transaction.groupBy({
      by: ["walletId", "type"],
      where: { userId, deletedAt: null },
      _sum: { amount: true },
    }),
  ]);
  return wallets.map((w) => {
    const sum = (type: "INCOME" | "EXPENSE") =>
      Number(sums.find((s) => s.walletId === w.id && s.type === type)?._sum.amount ?? 0);
    const initialBalance = Number(w.initialBalance);
    return {
      id: w.id,
      name: w.name,
      type: w.type,
      archived: w.archived,
      initialBalance,
      balance: initialBalance + sum("INCOME") - sum("EXPENSE"),
    };
  });
}

export type TransactionFilters = {
  from?: string;
  to?: string;
  type?: "INCOME" | "EXPENSE";
  categoryId?: string;
  walletId?: string;
  q?: string;
};

export function transactionWhere(
  userId: string,
  f: TransactionFilters,
): Prisma.TransactionWhereInput {
  return {
    userId,
    deletedAt: null,
    ...(f.from || f.to
      ? {
          date: {
            ...(f.from && { gte: new Date(`${f.from}T00:00:00Z`) }),
            ...(f.to && { lte: new Date(`${f.to}T00:00:00Z`) }),
          },
        }
      : {}),
    ...(f.type && { type: f.type }),
    ...(f.categoryId && { categoryId: f.categoryId }),
    ...(f.walletId && { walletId: f.walletId }),
    ...(f.q && { note: { contains: f.q, mode: "insensitive" as const } }),
  };
}

export async function listTransactions(userId: string, f: TransactionFilters, limit = 50) {
  const where = transactionWhere(userId, f);
  const [rows, total, sums] = await Promise.all([
    db.transaction.findMany({
      where,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: limit,
      include: {
        category: { select: { name: true, icon: true, color: true } },
        wallet: { select: { name: true } },
      },
    }),
    db.transaction.count({ where }),
    db.transaction.groupBy({ by: ["type"], where, _sum: { amount: true } }),
  ]);
  const sum = (t: string) => Number(sums.find((s) => s.type === t)?._sum.amount ?? 0);
  return {
    items: rows.map((t): TransactionDTO => ({
      id: t.id,
      type: t.type,
      amount: Number(t.amount),
      date: toDateStr(t.date),
      note: t.note,
      categoryId: t.categoryId,
      walletId: t.walletId,
      category: t.category,
      wallet: t.wallet,
    })),
    total,
    income: sum("INCOME"),
    expense: sum("EXPENSE"),
  };
}
