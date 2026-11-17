import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/** Нативный select в стиле приложения — доступный и удобный на телефоне. */
function NativeSelect({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <div className={cn("relative", className)}>
      <select
        className="glass-strong focus-visible:ring-ring focus-visible:ring-offset-background aria-invalid:ring-expense/60 [&>option]:bg-background h-11 w-full appearance-none rounded-sm pr-9 pl-3.5 text-[15px] outline-none focus-visible:ring-2 focus-visible:ring-offset-2 aria-invalid:ring-2"
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2"
      />
    </div>
  );
}

export { NativeSelect };
