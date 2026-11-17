"use client";

import { cn } from "@/lib/utils";

/** Сегментированный переключатель (design.md §7.5). Цвет активного сегмента задаётся опцией. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; activeClass?: string }[];
  label: string;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("glass inline-flex h-11 w-full rounded-full p-1", className)}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "focus-visible:ring-ring flex-auto rounded-full px-3 text-sm font-semibold whitespace-nowrap transition-colors outline-none focus-visible:ring-2",
            value === o.value
              ? (o.activeClass ?? "bg-primary text-primary-foreground")
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
