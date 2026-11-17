"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wallet } from "lucide-react";
import { NAV_ITEMS, isActive } from "@/components/layout/nav-items";
import { cn } from "@/lib/utils";

/**
 * Плавающий стеклянный сайдбар (design.md §6): 256px на десктопе (lg+),
 * 80px только с иконками на планшете (md–lg), скрыт на мобильных.
 */
export function Sidebar({ footer }: { footer: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <aside className="glass fixed inset-y-4 left-4 z-30 hidden w-20 flex-col rounded-lg p-3 md:flex lg:w-64 lg:p-4">
      <Link
        href="/dashboard"
        className="focus-visible:ring-ring mb-6 flex items-center justify-center gap-2.5 rounded-md px-1 py-1 text-lg font-bold outline-none focus-visible:ring-2 lg:justify-start"
      >
        <span className="bg-primary/15 text-primary inline-flex size-10 shrink-0 items-center justify-center rounded-full">
          <Wallet className="size-5" />
        </span>
        <span className="hidden lg:inline">Salary</span>
      </Link>

      <nav aria-label="Основная навигация" className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              title={label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "focus-visible:ring-ring relative flex h-11 items-center justify-center gap-3 rounded-md px-3 text-[15px] font-medium transition-colors outline-none focus-visible:ring-2 lg:justify-start",
                active
                  ? "bg-primary/12 text-primary"
                  : "text-muted-foreground hover:bg-foreground/6 hover:text-foreground",
              )}
            >
              {active && (
                <span
                  aria-hidden
                  className="bg-primary absolute top-2.5 bottom-2.5 left-0 w-[3px] rounded-full"
                />
              )}
              <Icon className="size-5 shrink-0" />
              <span className="hidden lg:inline">{label}</span>
            </Link>
          );
        })}
      </nav>

      {footer}
    </aside>
  );
}
