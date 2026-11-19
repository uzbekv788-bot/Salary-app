"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Card, Overline } from "@/components/ui/card";
import { Sparkline } from "@/components/charts/lazy";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n/locale-provider";

/** Плавный count-up числа (design.md §9): 500 мс, выключается при reduced-motion. */
function useCountUp(target: number, duration = 500) {
  const [value, setValue] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    // Первый показ — без анимации: число сразу в HTML (быстрый LCP). Анимируем только смену значения.
    if (from.current === target) return;
    const instant = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const tick = (t: number) => {
      const k = instant ? 1 : Math.min(1, (t - start) / duration);
      setValue(a + (target - a) * (1 - Math.pow(1 - k, 3)));
      if (k < 1) raf = requestAnimationFrame(tick);
      else from.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

export type KpiProps = {
  label: string;
  value: number;
  format: "money" | "percent";
  currency: string;
  /** Изменение к прошлому периоду: доля (0.12) или п.п. для процентов; null — нет данных */
  delta: number | null;
  /** Для расходов рост — это плохо */
  invert?: boolean;
  spark?: number[];
  sparkTone?: "chart-income" | "chart-expense" | "chart-balance";
  index?: number;
};

export function KpiCard({
  label,
  value,
  format,
  currency,
  delta,
  invert,
  spark,
  sparkTone,
  index = 0,
}: KpiProps) {
  const animated = useCountUp(value);
  const { t, fmt } = useI18n();
  const pct = (f: number) => fmt.percent(f).replace(/^−/, "");
  const money = (v: number) => fmt.money(Math.round(v / 100) * 100, currency, { cents: false });
  const shown = format === "money" ? money(animated) : pct(animated);
  const Arrow =
    delta === null || Math.abs(delta) < 0.005 ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight;
  const good = delta === null ? null : invert ? delta < 0 : delta > 0;
  const sign = delta === null ? "" : delta > 0 ? "+" : delta < 0 ? "−" : "";
  const deltaText =
    delta === null
      ? t("kpi.noData")
      : t("kpi.vsPrev", {
          delta:
            format === "percent"
              ? `${sign}${Math.abs(Math.round(delta * 100))} ${t("kpi.pp")}`
              : `${sign}${pct(Math.abs(Math.round(delta * 100)) / 100)}`,
        });

  return (
    <Card
      className="animate-[rise-in_250ms_var(--ease-out-soft)_both] transition-transform duration-150 hover:-translate-y-0.5"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <Overline>{label}</Overline>
      <p
        className="num mt-2 truncate text-[28px] leading-9 font-bold sm:text-[32px] sm:leading-10 2xl:text-[40px] 2xl:leading-[48px]"
        aria-label={`${label}: ${format === "money" ? money(value) : pct(value)}`}
      >
        {shown}
      </p>
      <p
        className={cn(
          "mt-1 inline-flex items-center gap-1 text-[13px] font-medium",
          good === null ? "text-muted-foreground" : good ? "text-income" : "text-expense",
        )}
      >
        <Arrow aria-hidden className="size-4" /> {deltaText}
      </p>
      {spark && sparkTone && (
        <div className="mt-2">
          <Sparkline points={spark} tone={sparkTone} />
        </div>
      )}
    </Card>
  );
}
