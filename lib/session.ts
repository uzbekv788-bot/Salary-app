import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { materializeRecurring } from "@/lib/recurring-server";

/**
 * Data Access Layer для сессии. Читает cookie запроса, поэтому вызывать
 * только внутри <Suspense> (требование Cache Components в Next.js 16).
 */
export const getSession = cache(async () => auth.api.getSession({ headers: await headers() }));

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  currency: string;
  timezone: string;
  onboarded: boolean;
};

/** Текущий пользователь или редирект на вход. Без онбординга — редирект на /onboarding. */
export async function requireUser({ allowNotOnboarded = false } = {}): Promise<CurrentUser> {
  const session = await getSession();
  if (!session) redirect("/login");
  const u = session.user;
  if (!u.onboarded && !allowNotOnboarded) redirect("/onboarding");
  // Регулярные операции, у которых наступила дата, появляются до того, как страница прочитает данные
  if (u.onboarded) await materializeRecurring(u.id, u.timezone);
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    image: u.image ?? null,
    currency: u.currency,
    timezone: u.timezone,
    onboarded: u.onboarded,
  };
}
