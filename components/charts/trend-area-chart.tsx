"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartTooltipBox } from "@/components/charts/chart-tooltip";
import { Segmented } from "@/components/ui/segmented";
import { useI18n } from "@/components/i18n/locale-provider";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { CHART_VARS, useCssVars } from "@/lib/hooks/use-css-vars";
import type { TrendPoint } from "@/lib/queries/analytics";

type Mode = "flow" | "balance";

/** Главный график дашборда «Динамика» (design.md §8.1): области доходов/расходов или линия баланса. */
export function TrendAreaChart({
  data: raw,
  currency,
  summary,
  cumulative = false,
}: {
  data: TrendPoint[];
  currency: string;
  summary: string;
  cumulative?: boolean;
}) {
  const [mode, setMode] = useState<Mode>("flow");
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");
  const mobile = useMediaQuery("(max-width: 639px)");
  const { t, fmt } = useI18n();
  const money = (v: number) => fmt.money(v, currency);
  // По дням суммы «пиковые» (зарплата раз в две недели), поэтому показываем нарастающий итог —
  // линии плавные, и видно, обгоняют ли расходы доходы к концу периода.
  const data = useMemo(() => {
    if (!cumulative) return raw;
    let inc = 0;
    let exp = 0;
    return raw.map((p) =>
      p.income === null || p.expense === null
        ? p
        : { ...p, income: (inc += p.income), expense: (exp += p.expense) },
    );
  }, [raw, cumulative]);
  const v = useCssVars(CHART_VARS);
  const C = { income: v["chart-income"], expense: v["chart-expense"], balance: v["chart-balance"] };

  const series =
    mode === "flow"
      ? ([
          { key: "income", label: t("common.income"), color: C.income },
          { key: "expense", label: t("common.expense"), color: C.expense },
        ] as const)
      : ([{ key: "balance", label: t("common.balance"), color: C.balance }] as const);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Segmented
          label={t("chart.whatToShow")}
          className="w-auto"
          value={mode}
          onChange={setMode}
          options={[
            { value: "flow", label: t("chart.flow") },
            { value: "balance", label: t("common.balance") },
          ]}
        />
        {/* Легенда: при двух сериях обязательна — цвет не единственный носитель смысла */}
        {mode === "flow" && (
          <ul className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
            {cumulative && <li>{t("chart.cumulative")}</li>}
            {series.map((s) => (
              <li key={s.key} className="flex items-center gap-1.5">
                <span
                  aria-hidden
                  className="h-[3px] w-4 rounded-full"
                  style={{ background: s.color }}
                />{" "}
                {s.label}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div role="img" aria-label={summary} className="h-[220px] sm:h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              {series.map((s) => (
                <linearGradient
                  key={s.key}
                  id={`grad-${s.key}-${mode}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor={s.color} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={s.color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke={v["chart-grid"]} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              minTickGap={mobile ? 24 : 32}
              tick={{ fill: v["muted-foreground"], fontSize: 12 }}
              dy={6}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={mobile ? 52 : 64}
              tickFormatter={(v: number) => fmt.compact(v)}
              tick={{ fill: v["muted-foreground"], fontSize: 12 }}
            />
            <Tooltip
              cursor={{ stroke: v["muted-foreground"], strokeWidth: 1, strokeDasharray: "4 4" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0].payload as TrendPoint;
                if (p.income === null || p.expense === null || p.balance === null) return null;
                return mode === "flow" ? (
                  <ChartTooltipBox
                    title={p.label}
                    rows={[
                      { color: C.income, label: t("common.income"), value: money(p.income) },
                      { color: C.expense, label: t("common.expense"), value: money(p.expense) },
                    ]}
                    footer={{
                      label: cumulative ? t("chart.diffSince") : t("common.difference"),
                      value: fmt.money(p.income - p.expense, currency, { signed: true }),
                    }}
                  />
                ) : (
                  <ChartTooltipBox
                    title={p.label}
                    rows={[
                      { color: C.balance, label: t("common.balance"), value: money(p.balance) },
                    ]}
                  />
                );
              }}
            />
            {series.map((s) => (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                strokeWidth={2.5}
                fill={`url(#grad-${s.key}-${mode})`}
                isAnimationActive={!reduced}
                animationDuration={600}
                dot={false}
                activeDot={{ r: 6, stroke: v.background, strokeWidth: 2, fill: s.color }}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <details className="mt-3 text-sm">
        <summary className="text-muted-foreground cursor-pointer text-[13px] font-medium">
          {t("common.showTable")}
        </summary>
        <div className="mt-2 max-h-64 overflow-auto">
          <table className="num w-full text-left text-[13px]">
            <thead className="text-muted-foreground">
              <tr>
                <th className="py-1 font-medium">{t("common.period")}</th>
                <th className="py-1 text-right font-medium">{t("common.income")}</th>
                <th className="py-1 text-right font-medium">{t("common.expense")}</th>
                <th className="py-1 text-right font-medium">{t("common.balance")}</th>
              </tr>
            </thead>
            <tbody>
              {raw
                .filter((p) => p.income !== null)
                .map((p) => (
                  <tr key={p.bucket} className="border-foreground/6 border-t">
                    <td className="py-1">{p.label}</td>
                    <td className="py-1 text-right">{money(p.income ?? 0)}</td>
                    <td className="py-1 text-right">{money(p.expense ?? 0)}</td>
                    <td className="py-1 text-right">{money(p.balance ?? 0)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
