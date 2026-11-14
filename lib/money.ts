/**
 * Деньги в Salary хранятся целыми числами в минорных единицах (1/100: копейки, центы, тийины),
 * чтобы избежать ошибок округления float (0.1 + 0.2 ≠ 0.3). См. SPEC.md §8.
 *
 * На сервере (Prisma) это BigInt, в UI — number: безопасно до 9·10^15, т. е. до 90 трлн единиц.
 */

export const MINOR_PER_MAJOR = 100;

/**
 * Разбирает сумму, введённую человеком, в минорные единицы.
 * Понимает пробелы-разделители тысяч, запятую или точку как десятичный разделитель.
 * "12 500,5" → 1250050, 12.5 → 1250. Возвращает null, если строка не похожа на сумму.
 */
export function parseAmount(input: string | number): number | null {
  if (typeof input === "number") {
    if (!Number.isFinite(input)) return null;
    return Math.round(input * MINOR_PER_MAJOR);
  }
  const cleaned = input.replace(/[\s  ]/g, "").replace(",", ".");
  const match = /^(-?)(\d+)(?:\.(\d{0,2}))?$/.exec(cleaned);
  if (!match) return null;
  const [, sign, whole, frac = ""] = match;
  const minor = Number(whole) * MINOR_PER_MAJOR + Number(frac.padEnd(2, "0"));
  if (!Number.isSafeInteger(minor)) return null;
  return sign ? -minor : minor;
}

/** Минорные → основные единицы (только для отображения/графиков, не для расчётов). */
export function toMajor(minor: number | bigint): number {
  return Number(minor) / MINOR_PER_MAJOR;
}

/** BigInt из БД → number для передачи в клиентские компоненты. */
export function fromDb(minor: bigint | null | undefined): number {
  return minor == null ? 0 : Number(minor);
}

type FormatOptions = {
  /** Показывать «+» у положительных сумм (доходы в списках). */
  signed?: boolean;
  /** Всегда показывать копейки. По умолчанию — только если они есть. */
  cents?: boolean;
};

const MINUS = "−"; // настоящий минус, design.md §3

/** 1250050 → "12 500,50 ₽". Валюта — ISO 4217. */
export function formatMoney(
  minor: number | bigint,
  currency = "RUB",
  { signed = false, cents }: FormatOptions = {},
): string {
  const value = Number(minor);
  const hasCents = value % MINOR_PER_MAJOR !== 0;
  const digits = (cents ?? hasCents) ? 2 : 0;
  const formatted = new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Math.abs(value) / MINOR_PER_MAJOR);

  if (value < 0) return MINUS + formatted;
  if (signed && value > 0) return "+" + formatted;
  return formatted;
}

/** Сокращённая запись для осей графиков: 125000000 → "1,3 млн". */
export function formatCompact(minor: number | bigint): string {
  const value = Number(minor) / MINOR_PER_MAJOR;
  const formatted = new Intl.NumberFormat("ru-RU", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Math.abs(value));
  return (value < 0 ? MINUS : "") + formatted;
}

/** Изменение к прошлому периоду, доля (0.12 = +12%). null — сравнивать не с чем. */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return (current - previous) / Math.abs(previous);
}

/** Норма сбережений: какую долю дохода удалось сохранить. null — дохода не было. */
export function savingsRate(income: number, expense: number): number | null {
  if (income <= 0) return null;
  return (income - expense) / income;
}

export function formatPercent(fraction: number, { signed = false } = {}): string {
  const formatted = new Intl.NumberFormat("ru-RU", {
    style: "percent",
    maximumFractionDigits: Math.abs(fraction) < 0.1 ? 1 : 0,
  }).format(Math.abs(fraction));
  if (fraction < 0) return MINUS + formatted;
  if (signed && fraction > 0) return "+" + formatted;
  return formatted;
}
