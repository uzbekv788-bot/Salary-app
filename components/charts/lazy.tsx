"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Recharts (~100 КБ) грузится отдельным чанком только на страницах с графиками
 * и не блокирует первую отрисовку (SPEC.md §10). Пока грузится — скелетон того же размера.
 */
export const TrendAreaChart = dynamic(
  () => import("./trend-area-chart").then((m) => m.TrendAreaChart),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[290px] w-full sm:h-[390px]" />,
  },
);

export const CategoryDonut = dynamic(
  () => import("./category-donut").then((m) => m.CategoryDonut),
  {
    ssr: false,
    loading: () => <Skeleton className="mx-auto size-[220px] rounded-full" />,
  },
);

export const MonthBars = dynamic(() => import("./month-bars").then((m) => m.MonthBars), {
  ssr: false,
  loading: () => <Skeleton className="h-[270px] w-full sm:h-[330px]" />,
});

export const Sparkline = dynamic(() => import("./sparkline").then((m) => m.Sparkline), {
  ssr: false,
  loading: () => <div className="h-8" />,
});
