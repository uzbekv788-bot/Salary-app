import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { toCsv } from "@/lib/csv";
import { db } from "@/lib/db";
import { transactionWhere } from "@/lib/queries/finance";

/** GET /api/export?from=&to=&type=&category=&wallet=&q= → CSV операций пользователя (tasks.md 12.2). */
export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return new Response("Unauthorized", { status: 401 });

  const sp = new URL(request.url).searchParams;
  const date = (k: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(sp.get(k) ?? "") ? sp.get(k)! : undefined;
  const type = sp.get("type");
  const where = transactionWhere(session.user.id, {
    from: date("from"),
    to: date("to"),
    type: type === "INCOME" || type === "EXPENSE" ? type : undefined,
    categoryId: sp.get("category") || undefined,
    walletId: sp.get("wallet") || undefined,
    q: sp.get("q")?.slice(0, 100) || undefined,
  });
  const rows = await db.transaction.findMany({
    where,
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    select: {
      date: true,
      type: true,
      amount: true,
      note: true,
      category: { select: { name: true } },
      wallet: { select: { name: true } },
    },
  });
  const csv = toCsv(
    rows.map((r) => ({
      date: r.date.toISOString().slice(0, 10),
      type: r.type,
      amount: Number(r.amount),
      category: r.category.name,
      wallet: r.wallet.name,
      note: r.note,
    })),
  );
  const name = `salary-${date("from") ?? "all"}${date("to") ? `_${date("to")}` : ""}.csv`;
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}
