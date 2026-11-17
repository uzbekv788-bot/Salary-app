import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db";

const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

/** Конфигурация аутентификации (tasks.md 4.1–4.3, 4.6). */
export const auth = betterAuth({
  database: prismaAdapter(db, { provider: "postgresql" }),

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    autoSignIn: true,
  },

  socialProviders: googleEnabled
    ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        },
      }
    : undefined,

  user: {
    additionalFields: {
      currency: { type: "string", defaultValue: "RUB", input: false },
      timezone: { type: "string", defaultValue: "Europe/Moscow", input: false },
      onboarded: { type: "boolean", defaultValue: false, input: false },
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 дней (PRD FR-1)
    updateAge: 60 * 60 * 24,
    // Кэш сессии в подписанной cookie — меньше запросов к БД на каждой странице
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },

  // Защита от подбора пароля: 5 попыток за 15 минут с одного IP.
  // По умолчанию Better Auth включает лимиты только в production; AUTH_RATE_LIMIT=1 — включить в dev.
  rateLimit: {
    enabled: process.env.NODE_ENV === "production" || process.env.AUTH_RATE_LIMIT === "1",
    customRules: {
      "/sign-in/email": { window: 15 * 60, max: 5 },
      "/sign-up/email": { window: 15 * 60, max: 5 },
    },
  },

  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
export const isGoogleEnabled = googleEnabled;
