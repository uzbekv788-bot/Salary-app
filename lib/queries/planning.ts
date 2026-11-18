import "server-only";
import { db } from "@/lib/db";
import { toDateStr } from "@/lib/actions/utils";
import type { Frequency } from "@/lib/recurring";

export type RecurringDTO = {
  id: string;
  type: "INCOME" | "EXPENSE";
  amount: number;
  note: string | null;
  frequency: Frequency;
  interval: number;
  startDate: string;
  nextDate: string;
  endDate: string | null;
  active: boolean;
  categoryId: string;
  walletId: string;
  category: { name: string; icon: string; color: string };
  wallet: { name: string };
};

export async function listRecurring(userId: string): Promise<RecurringDTO[]> {
  const rows = await db.recurringRule.findMany({
    where: { userId },
    orderBy: [{ active: "desc" }, { nextDate: "asc" }],
    include: {
      category: { select: { name: true, icon: true, color: true } },
      wallet: { select: { name: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    amount: Number(r.amount),
    note: r.note,
    frequency: r.frequency,
    interval: r.interval,
    startDate: toDateStr(r.startDate),
    nextDate: toDateStr(r.nextDate),
    endDate: r.endDate ? toDateStr(r.endDate) : null,
    active: r.active,
    categoryId: r.categoryId,
    walletId: r.walletId,
    category: r.category,
    wallet: r.wallet,
  }));
}

export type GoalDTO = {
  id: string;
  name: string;
  icon: string;
  color: string;
  target: number;
  saved: number;
  deadline: string | null;
  completedAt: string | null;
  contributions: { id: string; amount: number; date: string; note: string | null }[];
};

export async function listGoals(userId: string): Promise<GoalDTO[]> {
  const goals = await db.goal.findMany({
    where: { userId },
    orderBy: [
      { completedAt: { sort: "desc", nulls: "first" } },
      { deadline: { sort: "asc", nulls: "last" } },
      { createdAt: "asc" },
    ],
    include: { contributions: { orderBy: [{ date: "desc" }, { createdAt: "desc" }] } },
  });
  return goals.map((g) => ({
    id: g.id,
    name: g.name,
    icon: g.icon,
    color: g.color,
    target: Number(g.target),
    saved: g.contributions.reduce((s, c) => s + Number(c.amount), 0),
    deadline: g.deadline ? toDateStr(g.deadline) : null,
    completedAt: g.completedAt ? g.completedAt.toISOString() : null,
    contributions: g.contributions
      .slice(0, 10)
      .map((c) => ({ id: c.id, amount: Number(c.amount), date: toDateStr(c.date), note: c.note })),
  }));
}
