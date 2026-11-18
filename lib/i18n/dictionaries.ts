import type { Locale } from "@/lib/i18n/config";
import { shell } from "@/lib/i18n/messages/shell";
import { errors } from "@/lib/i18n/messages/errors";
import { tx } from "@/lib/i18n/messages/tx";
import { dash } from "@/lib/i18n/messages/dash";
import { manage } from "@/lib/i18n/messages/manage";

/** Все пространства имён; каждое — объект { ru, en, uz } с одинаковой формой. */
const NAMESPACES = [shell, errors, tx, dash, manage] as const;

function build<L extends Locale>(locale: L) {
  return Object.assign({}, ...NAMESPACES.map((ns) => ns[locale])) as Dict;
}

export type Dict = typeof shell.ru &
  typeof errors.ru &
  typeof tx.ru &
  typeof dash.ru &
  typeof manage.ru;
export const dictionaries: Record<Locale, Dict> = {
  ru: build("ru"),
  en: build("en"),
  uz: build("uz"),
};
