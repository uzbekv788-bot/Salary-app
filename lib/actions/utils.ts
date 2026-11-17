import "server-only";
import type { z } from "zod";

export type ActionResult<T = undefined> =
  { ok: true; data: T } | { ok: false; error: string; fieldErrors?: Record<string, string> };

export const ok = <T>(data: T): ActionResult<T> => ({ ok: true, data });
export const fail = (error: string, fieldErrors?: Record<string, string>): ActionResult<never> => ({
  ok: false,
  error,
  fieldErrors,
});

export function fromZod(error: z.ZodError): ActionResult<never> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) fieldErrors[issue.path.join(".")] ??= issue.message;
  return fail("Проверьте введённые данные", fieldErrors);
}

/** Prisma @db.Date → "YYYY-MM-DD" и обратно (UTC-полночь, без сдвига дня). */
export const toDateStr = (d: Date) => d.toISOString().slice(0, 10);
export const fromDateStr = (s: string) => new Date(`${s}T00:00:00Z`);
