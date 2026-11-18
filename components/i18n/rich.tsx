import { Fragment } from "react";

/**
 * Подставляет в шаблон перевода элементы React: rich("Вы сохранили {amount}", { amount: <b>…</b> }).
 * Порядок слов задаёт перевод, а не код — так фразы естественны на любом языке.
 */
export function rich(template: string, parts: Record<string, React.ReactNode>) {
  return template.split(/(\{\w+\})/g).map((chunk, i) => {
    const key = chunk.match(/^\{(\w+)\}$/)?.[1];
    return <Fragment key={i}>{key && key in parts ? parts[key] : chunk}</Fragment>;
  });
}
