import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Введите корректный email"),
  password: z.string().min(1, "Введите пароль"),
});

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Как вас зовут?").max(60, "Слишком длинное имя"),
  email: z.email("Введите корректный email"),
  password: z.string().min(8, "Минимум 8 символов").max(128, "Максимум 128 символов"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

/** Разрешаем редирект только на внутренние страницы (защита от open redirect). */
export function safeNext(next: string | null | undefined, fallback = "/dashboard") {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}
