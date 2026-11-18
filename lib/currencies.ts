export const CURRENCIES = [
  { code: "RUB", name: "Российский рубль", symbol: "₽" },
  { code: "USD", name: "Доллар США", symbol: "$" },
  { code: "EUR", name: "Евро", symbol: "€" },
  { code: "UZS", name: "Узбекский сум", symbol: "сум" },
  { code: "KZT", name: "Казахстанский тенге", symbol: "₸" },
  { code: "BYN", name: "Белорусский рубль", symbol: "Br" },
  { code: "GEL", name: "Грузинский лари", symbol: "₾" },
  { code: "TRY", name: "Турецкая лира", symbol: "₺" },
] as const;

export const CURRENCY_CODES = CURRENCIES.map((c) => c.code) as [string, ...string[]];

/** Символ валюты на языке интерфейса: у сума кириллический символ только в русском. */
export function currencySymbol(code: string, locale: string): string {
  const c = CURRENCIES.find((x) => x.code === code);
  if (!c) return code;
  if (code === "UZS" && locale !== "ru") return "soʻm";
  return c.symbol;
}
