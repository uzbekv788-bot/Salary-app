/**
 * Мини-библиотека переводов без зависимостей (tasks.md 18.1).
 * Словари — TS-объекты: английский и узбекский обязаны повторять форму русского (проверяет TypeScript).
 */
import { INTL_LOCALE, type Locale } from "@/lib/i18n/config";
import type { Dict } from "@/lib/i18n/dictionaries";

export type Plural = { one: string; few?: string; many?: string; other: string };
/** Та же форма, что у русского словаря, но с любыми строками */
export type Shape<T> = {
  [K in keyof T]: T[K] extends string ? string : T[K] extends Plural ? Plural : Shape<T[K]>;
};

export function defineMessages<T>(m: { ru: T; en: Shape<T>; uz: Shape<T> }) {
  return m;
}

type Join<K, P> = K extends string ? (P extends string ? `${K}.${P}` : never) : never;
/** Пути к строкам: "nav.dashboard" */
export type StringKeys<T> = {
  [K in keyof T & string]: T[K] extends string
    ? K
    : T[K] extends Plural
      ? never
      : Join<K, StringKeys<T[K]>>;
}[keyof T & string];
/** Пути к формам множественного числа */
export type PluralKeys<T> = {
  [K in keyof T & string]: T[K] extends string
    ? never
    : T[K] extends Plural
      ? K
      : Join<K, PluralKeys<T[K]>>;
}[keyof T & string];

type Vars = Record<string, string | number>;

function get(obj: unknown, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>(
      (o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined),
      obj,
    );
}

const fill = (s: string, vars?: Vars) =>
  vars ? s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : s;

export type TKey = StringKeys<Dict>;
export type TPluralKey = PluralKeys<Dict>;

export function createTranslator(dict: Dict, locale: Locale) {
  const rules = new Intl.PluralRules(INTL_LOCALE[locale]);
  const t = (key: TKey, vars?: Vars): string => {
    const v = get(dict, key);
    return typeof v === "string" ? fill(v, vars) : key;
  };
  /** Число + правильная форма: tp("tx.count", 5) → «5 операций». {n} в строке — само число. */
  const tp = (key: TPluralKey, n: number, vars?: Vars): string => {
    const forms = get(dict, key) as Plural | undefined;
    if (!forms) return key;
    const form = (forms[rules.select(n) as keyof Plural] ?? forms.other) as string;
    return fill(form, { n: new Intl.NumberFormat(INTL_LOCALE[locale]).format(n), ...vars });
  };
  /** Ключ из данных (например, код ошибки с сервера) — без проверки типов */
  const has = (key: string) => typeof get(dict, key) === "string";
  const dyn = (key: string, vars?: Vars) => {
    const v = get(dict, key);
    return typeof v === "string" ? fill(v, vars) : key;
  };
  return Object.assign(t, { tp, has, dyn, locale });
}
