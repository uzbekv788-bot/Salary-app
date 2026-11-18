import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("v.email"),
  password: z.string().min(1, "v.password"),
});

export const registerSchema = z.object({
  name: z.string().trim().min(1, "v.name").max(60, "v.nameLong"),
  email: z.email("v.email"),
  password: z.string().min(8, "v.min8").max(128, "v.max128"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

/** Разрешаем редирект только на внутренние страницы (защита от open redirect). */
export function safeNext(next: string | null | undefined, fallback = "/dashboard") {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}
