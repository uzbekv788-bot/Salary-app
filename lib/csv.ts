/** CSV экспорт/импорт (SPEC.md §8). Без зависимостей от сервера — тестируется в unit-тестах. */
import { parseAmount } from "@/lib/money";

export const CSV_COLUMNS = ["date", "type", "amount", "category", "wallet", "note"] as const;

const escape = (v: string) => (/[";\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/** Разделитель «;» и BOM — так файл корректно открывается в русском Excel. */
export function toCsv(
  rows: {
    date: string;
    type: string;
    amount: number;
    category: string;
    wallet: string;
    note: string | null;
  }[],
) {
  const lines = [CSV_COLUMNS.join(";")];
  for (const r of rows) {
    const amount = (r.amount / 100).toFixed(2).replace(".", ",");
    lines.push(
      [
        r.date,
        r.type === "INCOME" ? "income" : "expense",
        amount,
        r.category,
        r.wallet,
        r.note ?? "",
      ]
        .map(escape)
        .join(";"),
    );
  }
  return "﻿" + lines.join("\r\n") + "\r\n";
}

/** "14.11.2026", "2026-11-14", "14/11/2026", "14.11.26" → "2026-11-14" или null. */
export function parseCsvDate(raw: string): string | null {
  const s = raw.trim().slice(0, 10).replace(/\s.*/, "");
  let y: number, m: number, d: number;
  let match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (match) [y, m, d] = [+match[1], +match[2], +match[3]];
  else if ((match = /^(\d{1,2})[./](\d{1,2})[./](\d{2}|\d{4})$/.exec(s))) {
    [d, m, y] = [+match[1], +match[2], +match[3]];
    if (y < 100) y += 2000;
  } else return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d)
    return null;
  return date.toISOString().slice(0, 10);
}

export type ImportMapping = {
  date: string;
  amount: string;
  type?: string;
  category?: string;
  note?: string;
};
export type ImportRow = {
  date: string;
  type: "INCOME" | "EXPENSE";
  amount: number;
  category: string | null;
  note: string | null;
};

const INCOME_WORDS = /^(income|доход|поступление|пополнение|зачисление|\+)$/i;
const EXPENSE_WORDS = /^(expense|расход|списание|покупка|оплата|-)$/i;

/**
 * Превращает строку CSV в операцию. Тип берётся из колонки type, а если её нет —
 * из знака суммы (выписки банков: отрицательная сумма = расход).
 */
export function mapRow(
  row: Record<string, string>,
  map: ImportMapping,
): { ok: true; row: ImportRow } | { ok: false; error: string; value: string } {
  const date = parseCsvDate(row[map.date] ?? "");
  if (!date) return { ok: false, error: "err.csvDate", value: row[map.date] ?? "" };
  const rawAmount = (row[map.amount] ?? "")
    .replace(/[^\d,.\-−+\s]/g, "")
    .replace("−", "-")
    .trim();
  const minor = parseAmount(rawAmount.replace(/^\+/, ""));
  if (minor === null || minor === 0)
    return { ok: false, error: "err.csvAmount", value: row[map.amount] ?? "" };
  let type: ImportRow["type"] = minor < 0 ? "EXPENSE" : "INCOME";
  const t = map.type ? (row[map.type] ?? "").trim() : "";
  if (INCOME_WORDS.test(t)) type = "INCOME";
  else if (EXPENSE_WORDS.test(t)) type = "EXPENSE";
  else if (!map.type && minor > 0) type = "EXPENSE"; // без колонки типа и без знака считаем покупкой — как в большинстве выписок
  if (!map.type && rawAmount.startsWith("+")) type = "INCOME";
  return {
    ok: true,
    row: {
      date,
      type,
      amount: Math.abs(minor),
      category: map.category ? (row[map.category] ?? "").trim() || null : null,
      note: map.note ? (row[map.note] ?? "").trim().slice(0, 200) || null : null,
    },
  };
}

/** Угадываем соответствие колонок по заголовкам (наш экспорт и типовые выписки банков). */
export function guessMapping(headers: string[]): Partial<ImportMapping> {
  const find = (re: RegExp) => headers.find((h) => re.test(h.trim()));
  return {
    date: find(/^(date|дата)|дата операции/i),
    amount: find(/^(amount|сумма)|сумма операции/i),
    type: find(/^(type|тип)$/i),
    category: find(/^(category|категория)/i),
    note: find(/^(note|комментарий|описание|назначение)/i),
  };
}
