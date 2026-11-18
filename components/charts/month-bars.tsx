"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartTooltipBox } from "@/components/charts/chart-tooltip";
import { CHART_VARS, useCssVars } from "@/lib/hooks/use-css-vars";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { useI18n } from "@/components/i18n/locale-provider";
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
  const { t, fmt } = useI18n();
  const money = (x: number) => fmt.money(x, currency);
  return (
    <div>
      <ul className="text-muted-foreground mb-3 flex gap-4 text-[13px]">
        <li className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="size-2.5 rounded-[3px]"
            style={{ background: v["chart-income"] }}
          />{" "}
          {t("common.income")}
        </li>
        <li className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="size-2.5 rounded-[3px]"
            style={{ background: v["chart-expense"] }}
          />{" "}
          {t("common.expense")}
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
              tickFormatter={(x: number) => fmt.compact(x)}
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
                      {
                        color: v["chart-income"],
                        label: t("common.income"),
                        value: money(p.income),
                      },
                      {
                        color: v["chart-expense"],
                        label: t("common.expense"),
                        value: money(p.expense),
                      },
                    ]}
                    footer={{
                      label: t("common.difference"),
                      value: fmt.money(p.income - p.expense, currency, { signed: true }),
                    }}
                  />
                );
              }}
            />
            <Bar
              dataKey="income"
              name={t("common.income")}
              fill={v["chart-income"]}
              radius={[4, 4, 0, 0]}
              isAnimationActive={!reduced}
              animationDuration={600}
            />
            <Bar
              dataKey="expense"
              name={t("common.expense")}
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
          {t("common.showTable")}
        </summary>
        <div className="mt-2 overflow-x-auto">
          <table className="num w-full text-left text-[13px]">
            <thead className="text-muted-foreground">
              <tr>
                <th className="py-1 font-medium">{t("common.month")}</th>
                <th className="py-1 text-right font-medium">{t("common.income")}</th>
                <th className="py-1 text-right font-medium">{t("common.expense")}</th>
                <th className="py-1 text-right font-medium">{t("common.difference")}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((p) => (
                <tr key={p.month} className="border-foreground/6 border-t">
                  <td className="py-1">{p.label}</td>
                  <td className="py-1 text-right">{money(p.income)}</td>
                  <td className="py-1 text-right">{money(p.expense)}</td>
                  <td className="py-1 text-right">
                    {fmt.money(p.income - p.expense, currency, { signed: true })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
