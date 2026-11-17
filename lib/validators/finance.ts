import { z } from "zod";
import { CATEGORY_COLORS, CATEGORY_ICONS } from "@/lib/design/category-palette";
import { parseAmount } from "@/lib/money";

const id = z.string().min(1).max(64);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Выберите дату");

/** Сумма из поля ввода ("12 500,50") → минорные единицы; строго > 0. */
const positiveAmount = z.union([z.string(), z.number()]).transform((v, ctx) => {
  const minor = parseAmount(typeof v === "string" ? v : v);
  if (minor === null || minor <= 0) {
    ctx.addIssue({ code: "custom", message: "Введите сумму больше нуля" });
    return z.NEVER;
  }
  if (minor > 100_000_000_000) {
    ctx.addIssue({ code: "custom", message: "Слишком большая сумма" });
    return z.NEVER;
  }
  return minor;
});

export const txType = z.enum(["INCOME", "EXPENSE"]);

export const transactionSchema = z.object({
  type: txType,
  amount: positiveAmount,
  categoryId: id.describe("category"),
  walletId: id,
  date: isoDate,
  note: z
    .string()
    .trim()
    .max(200, "Не длиннее 200 символов")
    .optional()
    .transform((v) => v || null),
});
export type TransactionInput = z.input<typeof transactionSchema>;

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Введите название").max(40, "Не длиннее 40 символов"),
  type: txType,
  icon: z.string().refine((v) => v in CATEGORY_ICONS, "Выберите иконку"),
  color: z.enum(CATEGORY_COLORS),
});
export type CategoryInput = z.input<typeof categorySchema>;

export const walletSchema = z.object({
  name: z.string().trim().min(1, "Введите название").max(40, "Не длиннее 40 символов"),
  type: z.enum(["CARD", "CASH", "SAVINGS", "OTHER"]),
  initialBalance: z.union([z.string(), z.number()]).transform((v, ctx) => {
    const minor = parseAmount(typeof v === "string" && v.trim() === "" ? "0" : v);
    if (minor === null) {
      ctx.addIssue({ code: "custom", message: "Введите сумму" });
      return z.NEVER;
    }
    return minor;
  }),
});
export type WalletInput = z.input<typeof walletSchema>;
