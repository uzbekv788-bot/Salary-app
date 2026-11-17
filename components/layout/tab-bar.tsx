"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeftRight, ChartLine, LayoutDashboard, Menu, Plus } from "lucide-react";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { NAV_ITEMS, isActive } from "@/components/layout/nav-items";
import { useAddTransaction } from "@/components/transactions/add-transaction-provider";
import { cn } from "@/lib/utils";

const MAIN = [
  { href: "/dashboard", label: "Дашборд", icon: LayoutDashboard },
  { href: "/transactions", label: "Операции", icon: ArrowLeftRight },
  null, // место под кнопку «+»
  { href: "/analytics", label: "Аналитика", icon: ChartLine },
] as const;
const MORE = NAV_ITEMS.filter((i) => !MAIN.some((m) => m?.href === i.href));

const tabClass =
  "flex flex-1 flex-col items-center justify-center gap-0.5 rounded-md py-1.5 text-[11px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** Нижний таббар для мобильных (design.md §6). */
export function TabBar({ footer }: { footer: React.ReactNode }) {
  const pathname = usePathname();
  const { openForm } = useAddTransaction();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = MORE.some((i) => isActive(pathname, i.href));

  return (
    <>
      <nav
        aria-label="Основная навигация"
        className="glass fixed inset-x-2 bottom-2 z-30 flex h-16 items-center rounded-lg px-1 pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {MAIN.map((item) => {
          if (!item)
            return (
              <div key="add" className="flex flex-1 justify-center">
                <button
                  type="button"
                  onClick={openForm}
                  aria-label="Добавить операцию"
                  className="bg-primary text-primary-foreground shadow-primary/30 focus-visible:ring-ring -mt-7 inline-flex size-14 items-center justify-center rounded-full shadow-lg transition-transform outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-95"
                >
                  <Plus className="size-7" />
                </button>
              </div>
            );
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(tabClass, active ? "text-primary" : "text-muted-foreground")}
            >
              <item.icon className="size-6" />
              {item.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className={cn(tabClass, moreActive ? "text-primary" : "text-muted-foreground")}
        >
          <Menu className="size-6" />
          Ещё
        </button>
      </nav>

      <Drawer open={moreOpen} onOpenChange={setMoreOpen}>
        <DrawerContent aria-describedby={undefined}>
          <DrawerTitle>Ещё</DrawerTitle>
          <ul className="grid gap-1">
            {MORE.map(({ href, label, icon: Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  onClick={() => setMoreOpen(false)}
                  aria-current={isActive(pathname, href) ? "page" : undefined}
                  className="hover:bg-foreground/6 focus-visible:ring-ring aria-[current=page]:text-primary flex h-12 items-center gap-3 rounded-md px-3 text-[15px] font-medium outline-none focus-visible:ring-2"
                >
                  <Icon className="size-5" /> {label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="border-foreground/8 mt-4 border-t pt-4">{footer}</div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
