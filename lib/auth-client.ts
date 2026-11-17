"use client";

import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";
import type { auth } from "@/lib/auth";

export const authClient = createAuthClient({
  plugins: [inferAdditionalFields<typeof auth>()],
});

/** Переводит коды ошибок Better Auth в понятные сообщения. */
export function authErrorMessage(error: { code?: string; status?: number; message?: string }) {
  if (error.status === 429) return "Слишком много попыток. Попробуйте через 15 минут.";
  switch (error.code) {
    case "INVALID_EMAIL_OR_PASSWORD":
      return "Неверный email или пароль.";
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return "Пользователь с таким email уже зарегистрирован.";
    case "PASSWORD_TOO_SHORT":
      return "Пароль должен быть не короче 8 символов.";
    case "INVALID_EMAIL":
      return "Некорректный email.";
    default:
      return "Что-то пошло не так. Попробуйте ещё раз.";
  }
}
