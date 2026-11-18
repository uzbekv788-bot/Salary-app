import { z } from "zod";
import { CATEGORY_COLORS, CATEGORY_ICONS } from "@/lib/design/category-palette";
import { parseAmount } from "@/lib/money";

const id = z.string().min(1).max(64);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "v.date");

/** Сумма из поля ввода ("12 500,50") → минорные единицы; строго > 0. */
const positiveAmount = z.union([z.string(), z.number()]).transform((v, ctx) => {
  const minor = parseAmount(typeof v === "string" ? v : v);
  if (minor === null || minor <= 0) {
    ctx.addIssue({ code: "custom", message: "v.amountPositive" });
    return z.NEVER;
  }
  if (minor > 100_000_000_000) {
    ctx.addIssue({ code: "custom", message: "v.amountTooBig" });
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
    .max(200, "v.max200")
    .optional()
    .transform((v) => v || null),
  /** Офлайн-ввод: ID с устройства, повторная отправка не создаёт дубль */
  clientId: z.uuid().optional(),
});
export type TransactionInput = z.input<typeof transactionSchema>;

export const categorySchema = z.object({
  name: z.string().trim().min(1, "v.title").max(40, "v.max40"),
  type: txType,
  icon: z.string().refine((v) => v in CATEGORY_ICONS, "v.icon"),
  color: z.enum(CATEGORY_COLORS),
});
export type CategoryInput = z.input<typeof categorySchema>;

export const walletSchema = z.object({
  name: z.string().trim().min(1, "v.title").max(40, "v.max40"),
  type: z.enum(["CARD", "CASH", "SAVINGS", "OTHER"]),
  initialBalance: z.union([z.string(), z.number()]).transform((v, ctx) => {
    const minor = parseAmount(typeof v === "string" && v.trim() === "" ? "0" : v);
    if (minor === null) {
      ctx.addIssue({ code: "custom", message: "v.amount" });
      return z.NEVER;
    }
    return minor;
  }),
});
export type WalletInput = z.input<typeof walletSchema>;

export const budgetSchema = z.object({
  categoryId: id,
  month: z.string().regex(/^\d{4}-\d{2}-01$/, "v.month"),
  limit: positiveAmount,
});
export type BudgetInput = z.input<typeof budgetSchema>;

export const frequencySchema = z.enum(["WEEKLY", "MONTHLY", "YEARLY"]);

export const recurringSchema = z
  .object({
    type: txType,
    amount: positiveAmount,
    categoryId: id,
    walletId: id,
    note: z
      .string()
      .trim()
      .max(200, "v.max200")
      .optional()
      .transform((v) => v || null),
    frequency: frequencySchema,
    interval: z.coerce.number().int().min(1).max(12),
    /** Дата первого (для нового) или следующего (при редактировании) повторения */
    nextDate: isoDate,
    endDate: z
      .string()
      .optional()
      .transform((v) => v || null)
      .pipe(isoDate.nullable()),
  })
  .refine((v) => !v.endDate || v.endDate >= v.nextDate, {
    path: ["endDate"],
    message: "v.endBeforeStart",
  });
export type RecurringInput = z.input<typeof recurringSchema>;

export const goalSchema = z.object({
  name: z.string().trim().min(1, "v.goalName").max(40, "v.max40"),
  icon: z.string().refine((v) => v in CATEGORY_ICONS, "v.icon"),
  color: z.enum(CATEGORY_COLORS),
  target: positiveAmount,
  deadline: z
    .string()
    .optional()
    .transform((v) => v || null)
    .pipe(isoDate.nullable()),
});
export type GoalInput = z.input<typeof goalSchema>;

export const contributionSchema = z.object({
  goalId: id,
  direction: z.enum(["IN", "OUT"]),
  amount: positiveAmount,
  date: isoDate,
  note: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((v) => v || null),
});
export type ContributionInput = z.input<typeof contributionSchema>;
