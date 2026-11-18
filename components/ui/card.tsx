import * as React from "react";
import { cn } from "@/lib/utils";

/** Стеклянная карточка — базовая поверхность приложения (design.md §5). */
function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn("glass min-w-0 rounded-lg p-4 sm:p-5 [&>*]:min-w-0", className)}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("mb-4 flex flex-wrap items-center justify-between gap-3", className)}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return <h2 className={cn("text-lg leading-[26px] font-semibold", className)} {...props} />;
}

function Overline({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      className={cn(
        "text-muted-foreground text-xs leading-4 font-semibold tracking-[0.04em] uppercase",
        className,
      )}
      {...props}
    />
  );
}

export { Card, CardHeader, CardTitle, Overline };
