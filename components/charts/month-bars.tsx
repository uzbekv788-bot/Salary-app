"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartTooltipBox } from "@/components/charts/chart-tooltip";
import { CHART_VARS, useCssVars } from "@/lib/hooks/use-css-vars";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { formatCompact, formatMoney } from "@/lib/money";
import type { MonthPoint } from "@/lib/queries/analytics";

/** Доходы vs расходы по месяцам (design.md §8.2): сгруппированные столбцы, 2px зазор, скруглённые верхушки. */
export function MonthBars({
  data,
  currency,
  summary,
}: {
  data: MonthPoint[];
  currency: string;
  summary: string;
}) {
  const v = useCssVars(CHART_VARS);
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");
  const mobile = useMediaQuery("(max-width: 639px)");
  const money = (x: number) => formatMoney(x, currency);
  return (
    <div>
      <ul className="text-muted-foreground mb-3 flex gap-4 text-[13px]">
        <li className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="size-2.5 rounded-[3px]"
            style={{ background: v["chart-income"] }}
          />{" "}
          Доходы
        </li>
        <li className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="size-2.5 rounded-[3px]"
            style={{ background: v["chart-expense"] }}
          />{" "}
          Расходы
        </li>
      </ul>
      <div role="img" aria-label={summary} className="h-[240px] sm:h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            barGap={2}
            barCategoryGap={mobile ? "18%" : "28%"}
            margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
          >
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke={v["chart-grid"]} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              interval={mobile && data.length > 6 ? 1 : 0}
              tick={{ fill: v["muted-foreground"], fontSize: 12 }}
              dy={6}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={mobile ? 52 : 64}
              tickFormatter={(x: number) => formatCompact(x)}
              tick={{ fill: v["muted-foreground"], fontSize: 12 }}
            />
            <Tooltip
              cursor={{ fill: v["chart-grid"] }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0].payload as MonthPoint;
                return (
                  <ChartTooltipBox
                    title={p.label}
                    rows={[
                      { color: v["chart-income"], label: "Доходы", value: money(p.income) },
                      { color: v["chart-expense"], label: "Расходы", value: money(p.expense) },
                    ]}
                    footer={{
                      label: "Разница",
                      value: formatMoney(p.income - p.expense, currency, { signed: true }),
                    }}
                  />
                );
              }}
            />
            <Bar
              dataKey="income"
              name="Доходы"
              fill={v["chart-income"]}
              radius={[4, 4, 0, 0]}
              isAnimationActive={!reduced}
              animationDuration={600}
            />
            <Bar
              dataKey="expense"
              name="Расходы"
              fill={v["chart-expense"]}
              radius={[4, 4, 0, 0]}
              isAnimationActive={!reduced}
              animationDuration={600}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <details className="mt-3 text-sm">
        <summary className="text-muted-foreground cursor-pointer text-[13px] font-medium">
          Показать таблицей
        </summary>
        <table className="num mt-2 w-full text-left text-[13px]">
          <thead className="text-muted-foreground">
            <tr>
              <th className="py-1 font-medium">Месяц</th>
              <th className="py-1 text-right font-medium">Доходы</th>
              <th className="py-1 text-right font-medium">Расходы</th>
              <th className="py-1 text-right font-medium">Разница</th>
            </tr>
          </thead>
          <tbody>
            {data.map((p) => (
              <tr key={p.month} className="border-foreground/6 border-t">
                <td className="py-1">{p.label}</td>
                <td className="py-1 text-right">{money(p.income)}</td>
                <td className="py-1 text-right">{money(p.expense)}</td>
                <td className="py-1 text-right">
                  {formatMoney(p.income - p.expense, currency, { signed: true })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
