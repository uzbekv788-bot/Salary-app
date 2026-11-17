"use client";

import { useMemo, useSyncExternalStore } from "react";

/**
 * Значения CSS-переменных (токенов дизайна) для SVG-графиков: Recharts пишет цвета
 * в атрибуты, где var(--x) не работает. Пересчитывается при смене темы (класс на <html>).
 */
function subscribe(cb: () => void) {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style"] });
  const mql = window.matchMedia("(prefers-color-scheme: dark)");
  mql.addEventListener("change", cb);
  return () => {
    mo.disconnect();
    mql.removeEventListener("change", cb);
  };
}

export function useCssVars<T extends string>(names: readonly T[]): Record<T, string> {
  const key = names.join(",");
  const snapshot = useSyncExternalStore(
    subscribe,
    () => {
      const cs = getComputedStyle(document.documentElement);
      return names.map((n) => cs.getPropertyValue(`--${n}`).trim()).join("|");
    },
    () => "",
  );
  return useMemo(() => {
    const vals = snapshot.split("|");
    return Object.fromEntries(
      key.split(",").map((n, i) => [n, vals[i] || "currentColor"]),
    ) as Record<T, string>;
  }, [snapshot, key]);
}

export const CHART_VARS = [
  "chart-income",
  "chart-expense",
  "chart-balance",
  "chart-grid",
  "muted-foreground",
  "background",
] as const;
export const CATEGORY_VARS = [
  "cat-emerald",
  "cat-sky",
  "cat-violet",
  "cat-amber",
  "cat-rose",
  "cat-teal",
  "cat-indigo",
  "cat-orange",
  "cat-slate",
] as const;
