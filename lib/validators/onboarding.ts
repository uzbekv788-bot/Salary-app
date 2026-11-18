import { z } from "zod";
import { DEFAULT_CATEGORIES } from "@/lib/design/category-palette";
import { CURRENCY_CODES } from "@/lib/currencies";
import { parseAmount } from "@/lib/money";

const categoryKeys = DEFAULT_CATEGORIES.map((c) => c.key) as [string, ...string[]];
const isTimeZone = (tz: string) => {
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

export const onboardingSchema = z
  .object({
    currency: z.enum(CURRENCY_CODES),
    timezone: z.string().refine(isTimeZone, "v.timezone"),
    categoryKeys: z.array(z.enum(categoryKeys)),
    wallet: z.object({
      name: z.string().trim().min(1, "v.walletName").max(40, "v.titleLong"),
      type: z.enum(["CARD", "CASH", "SAVINGS", "OTHER"]),
      initialBalance: z.string().transform((v, ctx) => {
        const minor = parseAmount(v.trim() === "" ? "0" : v);
        if (minor === null) {
          ctx.addIssue({ code: "custom", message: "v.amountExample" });
          return z.NEVER;
        }
        return minor;
      }),
    }),
  })
  .refine(
    (v) => {
      const picked = DEFAULT_CATEGORIES.filter((c) => v.categoryKeys.includes(c.key));
      return picked.some((c) => c.type === "INCOME") && picked.some((c) => c.type === "EXPENSE");
    },
    {
      path: ["categoryKeys"],
      message: "v.needBothCategories",
    },
  );

export type OnboardingInput = z.input<typeof onboardingSchema>;
