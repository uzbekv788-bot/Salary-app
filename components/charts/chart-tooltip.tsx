import { cn } from "@/lib/utils";

/** Стеклянный тултип графиков (design.md §8.1). Текст — токенами текста, цвет несут только маркеры. */
export function ChartTooltipBox({
  title,
  rows,
  footer,
}: {
  title: string;
  rows: { color: string; label: string; value: string }[];
  footer?: { label: string; value: string };
}) {
  return (
    <div className="glass-strong min-w-44 rounded-sm px-3 py-2.5 text-[13px] shadow-lg">
      <p className="mb-1.5 font-semibold first-letter:uppercase">{title}</p>
      <ul className="grid gap-1">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center gap-2">
            <span
              aria-hidden
              className="size-2.5 shrink-0 rounded-full"
              style={{ background: r.color }}
            />
            <span className="text-muted-foreground flex-1">{r.label}</span>
            <span className="num font-semibold">{r.value}</span>
          </li>
        ))}
      </ul>
      {footer && (
        <p className={cn("border-foreground/10 mt-1.5 flex justify-between gap-3 border-t pt-1.5")}>
          <span className="text-muted-foreground">{footer.label}</span>
          <span className="num font-semibold">{footer.value}</span>
        </p>
      )}
    </div>
  );
}
