import "server-only";
import { requireUser } from "@/lib/session";
import { resolvePeriod, todayIn } from "@/lib/period";
import { getLocale } from "@/lib/i18n/server";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Период из URL с учётом часового пояса пользователя. Читает сессию — только внутри <Suspense>. */
export async function getPeriod(searchParams: SearchParams) {
  const [user, params, locale] = await Promise.all([requireUser(), searchParams, getLocale()]);
  const today = todayIn(user.timezone);
  return { user, params, today, period: resolvePeriod(params, today, locale) };
}
