import { createElement } from "react";
import { categoryColorVar, getCategoryIcon } from "@/lib/design/category-palette";
import { cn } from "@/lib/utils";

/** Иконка категории: линейная иконка Lucide в полупрозрачном круге цвета категории (design.md §7.2). */
export function CategoryIcon({
  icon,
  color,
  size = "md",
  className,
}: {
  icon: string;
  color: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const c = categoryColorVar(color);
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full",
        size === "md" ? "size-10" : "size-8",
        className,
      )}
      style={{ color: c, backgroundColor: `color-mix(in srgb, ${c} 16%, transparent)` }}
    >
      {createElement(getCategoryIcon(icon), {
        className: size === "md" ? "size-5" : "size-4",
        strokeWidth: 2,
      })}
    </span>
  );
}
