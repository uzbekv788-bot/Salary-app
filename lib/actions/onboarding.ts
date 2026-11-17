"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { DEFAULT_CATEGORIES } from "@/lib/design/category-palette";
import { requireUser } from "@/lib/session";
import { onboardingSchema, type OnboardingInput } from "@/lib/validators/onboarding";

export type ActionResult = { ok: false; error: string; fieldErrors?: Record<string, string> };

/** Завершение онбординга (tasks.md 6.4): валюта, категории и первый счёт — одной транзакцией БД. */
export async function completeOnboarding(input: OnboardingInput): Promise<ActionResult> {
  const user = await requireUser({ allowNotOnboarded: true });
  if (user.onboarded) redirect("/dashboard");

  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[issue.path.join(".")] ??= issue.message;
    return { ok: false, error: "Проверьте введённые данные", fieldErrors };
  }
  const { currency, timezone, categoryKeys, wallet } = parsed.data;
  const categories = DEFAULT_CATEGORIES.filter((c) => categoryKeys.includes(c.key));

  await db.$transaction([
    db.category.createMany({
      data: categories.map((c, i) => ({
        userId: user.id,
        name: c.name,
        type: c.type,
        icon: c.icon,
        color: c.color,
        sortOrder: i,
      })),
      skipDuplicates: true,
    }),
    db.wallet.create({
      data: {
        userId: user.id,
        name: wallet.name,
        type: wallet.type,
        initialBalance: BigInt(wallet.initialBalance),
      },
    }),
    db.user.update({ where: { id: user.id }, data: { currency, timezone, onboarded: true } }),
  ]);

  // Сессия кэшируется в cookie — перечитываем из БД, чтобы флаг onboarded обновился сразу
  await auth.api.getSession({ headers: await headers(), query: { disableCookieCache: true } });
  redirect("/dashboard");
}
