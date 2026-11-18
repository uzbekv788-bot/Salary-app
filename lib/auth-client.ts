"use client";

import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";
import type { auth } from "@/lib/auth";

export const authClient = createAuthClient({
  plugins: [inferAdditionalFields<typeof auth>()],
});

/** Код ошибки Better Auth → ключ перевода (auth.err.*); переводится в форме через t.dyn. */
export function authErrorMessage(error: { code?: string; status?: number; message?: string }) {
  if (error.status === 429) return "auth.err.rateLimit";
  switch (error.code) {
    case "INVALID_EMAIL_OR_PASSWORD":
      return "auth.err.invalid";
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return "auth.err.exists";
    case "PASSWORD_TOO_SHORT":
      return "auth.err.short";
    case "INVALID_EMAIL":
      return "auth.err.email";
    default:
      return "auth.err.generic";
  }
}
