"use client";

import { Line, LineChart, ResponsiveContainer, YAxis } from "recharts";
import { CHART_VARS, useCssVars } from "@/lib/hooks/use-css-vars";

/** Мини-график в KPI-карточке (design.md §7.1): без осей и тултипа, декоративный. */
export function Sparkline({
  points,
  tone,
}: {
  points: number[];
  tone: "chart-income" | "chart-expense" | "chart-balance";
}) {
  const color = useCssVars(CHART_VARS)[tone];
  if (points.length < 2) return <div className="h-8" />;
  const data = points.map((v, i) => ({ i, v }));
  return (
    <div className="h-8" aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <Line
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
