"use client";

import { Cell, Pie, PieChart, Tooltip } from "recharts";
import { ChartTooltipBox } from "@/components/charts/chart-tooltip";
import { CategoryIcon } from "@/components/ui/category-icon";
import { categoryColorVar } from "@/lib/design/category-palette";
import { formatMoney, formatPercent } from "@/lib/money";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { CATEGORY_VARS, useCssVars } from "@/lib/hooks/use-css-vars";
import type { CategorySlice } from "@/lib/queries/analytics";

/**
 * Донат структуры расходов (design.md §8.2). Максимум 5 сегментов (хвост → «Прочее»),
 * 2px зазоры, и обязательная легенда-список с иконками: цвета категорий выбирает
 * пользователь, поэтому цвет не может быть единственным носителем смысла.
 */
export function CategoryDonut({
  slices,
  total,
  currency,
  centerLabel,
}: {
  slices: CategorySlice[];
  total: number;
  currency: string;
  centerLabel: string;
}) {
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");
  const cat = useCssVars(CATEGORY_VARS);
  const fill = (color: string) =>
    cat[`cat-${color}` as (typeof CATEGORY_VARS)[number]] ?? cat["cat-slate"];
  const summary =
    `${centerLabel}: ${formatMoney(total, currency)}. ` +
    slices.map((s) => `${s.name} ${formatPercent(s.share)}`).join(", ");

  return (
    <div className="grid gap-4">
      <div role="img" aria-label={summary} className="relative mx-auto size-[220px]">
        <PieChart width={220} height={220}>
          <Pie
            data={slices}
            dataKey="total"
            nameKey="name"
            innerRadius="70%"
            outerRadius="100%"
            paddingAngle={2}
            cornerRadius={4}
            stroke="none"
            startAngle={90}
            endAngle={-270}
            isAnimationActive={!reduced}
            animationDuration={600}
          >
            {slices.map((s) => (
              <Cell key={s.id} fill={fill(s.color)} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const s = payload[0].payload as CategorySlice;
              return (
                <ChartTooltipBox
                  title={s.name}
                  rows={[
                    {
                      color: categoryColorVar(s.color),
                      label: formatPercent(s.share),
                      value: formatMoney(s.total, currency),
                    },
                  ]}
                />
              );
            }}
          />
        </PieChart>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-muted-foreground text-xs font-semibold tracking-[0.04em] uppercase">
            {centerLabel}
          </span>
          <span className="num text-xl font-bold">{formatMoney(total, currency)}</span>
        </div>
      </div>
      <ul className="grid gap-2">
        {slices.map((s) => (
          <li key={s.id} className="flex items-center gap-2.5 text-sm">
            <CategoryIcon icon={s.icon} color={s.color} size="sm" />
            <span className="min-w-0 flex-1 truncate font-medium">{s.name}</span>
            <span className="num text-muted-foreground">{formatPercent(s.share)}</span>
            <span className="num w-24 text-right font-semibold">
              {formatMoney(s.total, currency)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
