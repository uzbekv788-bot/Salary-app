import "server-only";
import { requireUser } from "@/lib/session";
import { resolvePeriod, todayIn } from "@/lib/period";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Период из URL с учётом часового пояса пользователя. Читает сессию — только внутри <Suspense>. */
export async function getPeriod(searchParams: SearchParams) {
  const [user, params] = await Promise.all([requireUser(), searchParams]);
  const today = todayIn(user.timezone);
  return { user, params, today, period: resolvePeriod(params, today) };
}
