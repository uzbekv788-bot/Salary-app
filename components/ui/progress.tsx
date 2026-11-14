"use client";

import * as React from "react";
import { Progress as ProgressPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

type Tone = "primary" | "warning" | "expense";
const toneClass: Record<Tone, string> = {
  primary: "bg-primary",
  warning: "bg-warning",
  expense: "bg-expense",
};

function Progress({
  className,
  value = 0,
  tone = "primary",
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root> & { tone?: Tone }) {
  const clamped = Math.min(100, Math.max(0, value ?? 0));
  return (
    <ProgressPrimitive.Root
      className={cn("bg-foreground/8 relative h-2 w-full overflow-hidden rounded-full", className)}
      value={clamped}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn("h-full rounded-full transition-transform duration-500", toneClass[tone])}
        style={{ transform: `translateX(-${100 - clamped}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}

export { Progress };
