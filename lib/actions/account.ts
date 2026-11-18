"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { CURRENCY_CODES } from "@/lib/currencies";
import { DEFAULT_CATEGORIES } from "@/lib/design/category-palette";
import { requireUser } from "@/lib/session";
import { getLocale } from "@/lib/i18n/server";
import { dictionaries } from "@/lib/i18n/dictionaries";
import { type ActionResult, fail, fromDateStr, fromZod, ok } from "@/lib/actions/utils";

const isTimeZone = (tz: string) => {
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

const profileSchema = z.object({
  name: z.string().trim().min(1, "v.name").max(60, "v.nameLong"),
  currency: z.enum(CURRENCY_CODES),
  timezone: z.string().refine(isTimeZone, "v.timezone"),
});

/** Профиль (tasks.md 12.1). Валюта меняет только отображение — суммы не конвертируются. */
export async function updateProfile(
  input: z.input<typeof profileSchema>,
): Promise<ActionResult<undefined>> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  await db.user.update({ where: { id: user.id }, data: parsed.data });
  // Сессия кэшируется в cookie — перечитываем, чтобы новая валюта появилась сразу
  await auth.api.getSession({ headers: await headers(), query: { disableCookieCache: true } });
  revalidatePath("/", "layout");
  return ok(undefined);
}

const importSchema = z.object({
  walletId: z.string().min(1),
  rows: z
    .array(
      z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        type: z.enum(["INCOME", "EXPENSE"]),
        amount: z.number().int().positive().max(100_000_000_000),
        category: z.string().max(40).nullable(),
        note: z.string().max(200).nullable(),
      }),
    )
    .min(1, "err.importEmpty")
    .max(5000, "err.importTooMany"),
});

/**
 * Импорт CSV (tasks.md 12.3). Категории ищутся по имени без учёта регистра;
 * не найденные — создаются, если имя задано, иначе операция идёт в «Прочее».
 */
export async function importTransactions(
  input: z.input<typeof importSchema>,
): Promise<ActionResult<{ imported: number; createdCategories: number }>> {
  const user = await requireUser();
  const parsed = importSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const { walletId, rows } = parsed.data;
  const wallet = await db.wallet.findFirst({ where: { id: walletId, userId: user.id } });
  if (!wallet) return fail("err.walletNotFound");

  const dict = dictionaries[await getLocale()];
  const existing = await db.category.findMany({
    where: { userId: user.id },
    select: { id: true, name: true, type: true },
  });
  const key = (type: string, name: string) => `${type}:${name.trim().toLowerCase()}`;
  const ids = new Map(existing.map((c) => [key(c.type, c.name), c.id]));
  let createdCategories = 0;

  const ensure = async (type: "INCOME" | "EXPENSE", name: string | null) => {
    const fallback = DEFAULT_CATEGORIES.find(
      (c) => c.type === type && c.icon === "CircleEllipsis",
    )!;
    // «Прочее» — на языке интерфейса пользователя
    const wanted =
      name || dict.defaultCats[fallback.key as keyof typeof dict.defaultCats] || fallback.name;
    const k = key(type, wanted);
    if (ids.has(k)) return ids.get(k)!;
    const created = await db.category.create({
      data: {
        userId: user.id,
        type,
        name: wanted,
        icon: name ? "Package" : fallback.icon,
        color: "slate",
        sortOrder: 999,
      },
    });
    ids.set(k, created.id);
    createdCategories++;
    return created.id;
  };

  const data = [];
  for (const r of rows) {
    data.push({
      userId: user.id,
      walletId,
      type: r.type,
      amount: BigInt(r.amount),
      date: fromDateStr(r.date),
      note: r.note,
      categoryId: await ensure(r.type, r.category),
    });
  }
  // Пачками по 500, чтобы не упереться в лимит параметров запроса
  for (let i = 0; i < data.length; i += 500)
    await db.transaction.createMany({ data: data.slice(i, i + 500) });
  revalidatePath("/", "layout");
  return ok({ imported: data.length, createdCategories });
}

/** Удаление аккаунта и всех данных (tasks.md 12.4). Требует ввести свой email. */
export async function deleteAccount(confirmEmail: string): Promise<ActionResult<undefined>> {
  const user = await requireUser({ allowNotOnboarded: true });
  if (confirmEmail.trim().toLowerCase() !== user.email.toLowerCase())
    return fail("err.emailMismatch", { email: "err.emailMismatch" });
  // Сначала операции: у них связь с категориями/счетами «Restrict»
  await db.$transaction([
    db.transaction.deleteMany({ where: { userId: user.id } }),
    db.user.delete({ where: { id: user.id } }),
  ]);
  return ok(undefined);
}
