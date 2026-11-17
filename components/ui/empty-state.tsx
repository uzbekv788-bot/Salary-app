import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Пустое состояние (design.md §7.7): иконка, заголовок, пояснение, действие. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center px-4 py-10 text-center", className)}>
      <span className="bg-primary/12 text-primary mb-4 inline-flex size-14 items-center justify-center rounded-full">
        <Icon className="size-7" />
      </span>
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && <p className="text-muted-foreground mt-1 max-w-sm text-sm">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
