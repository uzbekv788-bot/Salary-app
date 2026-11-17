"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarRange, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PERIOD_LABELS, type PeriodKind, type ResolvedPeriod } from "@/lib/period";
import { cn } from "@/lib/utils";

const PERIOD_PARAMS = ["period", "date", "from", "to"];

/** Переключатель периода (design.md §6): тип периода ▾ + стрелки ← →. Состояние — в URL. */
export function PeriodPicker({
  period,
  className,
}: {
  period: ResolvedPeriod;
  className?: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [customOpen, setCustomOpen] = useState(false);

  /** Сохраняем остальные фильтры (например, счёт), меняя только параметры периода. */
  const hrefWith = (next: Record<string, string>) => {
    const sp = new URLSearchParams(searchParams);
    PERIOD_PARAMS.forEach((k) => sp.delete(k));
    Object.entries(next).forEach(([k, v]) => sp.set(k, v));
    return `${pathname}?${sp}`;
  };

  const arrow =
    "inline-flex size-9 items-center justify-center rounded-full transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring";
  const enabled = "text-foreground hover:bg-foreground/6";
  const disabled = "pointer-events-none text-muted-foreground/40";

  return (
    <div className={cn("glass inline-flex h-11 items-center gap-0.5 rounded-full p-1", className)}>
      {period.prevParams ? (
        <Link
          href={hrefWith(period.prevParams)}
          aria-label="Предыдущий период"
          className={cn(arrow, enabled)}
          scroll={false}
        >
          <ChevronLeft className="size-5" />
        </Link>
      ) : (
        <span aria-hidden className={cn(arrow, disabled)}>
          <ChevronLeft className="size-5" />
        </span>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger className="hover:bg-foreground/6 focus-visible:ring-ring inline-flex h-9 min-w-0 items-center gap-1.5 rounded-full px-3 text-sm font-semibold outline-none focus-visible:ring-2">
          <span className="truncate">{period.label}</span>
          <ChevronDown className="text-muted-foreground size-4 shrink-0" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center">
          <DropdownMenuRadioGroup
            value={period.kind}
            onValueChange={(kind) =>
              kind !== "custom" && router.push(hrefWith({ period: kind }), { scroll: false })
            }
          >
            {(["week", "month", "quarter", "year"] as PeriodKind[]).map((k) => (
              <DropdownMenuRadioItem key={k} value={k}>
                {PERIOD_LABELS[k]}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setCustomOpen(true)}>
            <CalendarRange /> Свой период…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {period.nextParams ? (
        <Link
          href={hrefWith(period.nextParams)}
          aria-label="Следующий период"
          className={cn(arrow, enabled)}
          scroll={false}
        >
          <ChevronRight className="size-5" />
        </Link>
      ) : (
        <span aria-hidden className={cn(arrow, disabled)}>
          <ChevronRight className="size-5" />
        </span>
      )}

      <Dialog open={customOpen} onOpenChange={setCustomOpen}>
        <DialogContent aria-describedby={undefined}>
          <DialogTitle>Свой период</DialogTitle>
          <form
            className="mt-4 grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              setCustomOpen(false);
              router.push(
                hrefWith({
                  period: "custom",
                  from: String(fd.get("from")),
                  to: String(fd.get("to")),
                }),
                { scroll: false },
              );
            }}
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="pp-from">С</Label>
                <Input id="pp-from" name="from" type="date" required defaultValue={period.from} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="pp-to">По</Label>
                <Input id="pp-to" name="to" type="date" required defaultValue={period.to} />
              </div>
            </div>
            <Button type="submit">Показать</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
