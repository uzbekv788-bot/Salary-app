import {
  ArrowLeftRight,
  ChartLine,
  LayoutDashboard,
  PiggyBank,
  Repeat,
  Target,
  Settings,
  Tags,
  type LucideIcon,
} from "lucide-react";

import type { TKey } from "@/lib/i18n/core";

export type NavItem = { href: string; label: TKey; icon: LucideIcon };

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "nav.dashboard", icon: LayoutDashboard },
  { href: "/transactions", label: "nav.transactions", icon: ArrowLeftRight },
  { href: "/categories", label: "nav.categories", icon: Tags },
  { href: "/analytics", label: "nav.analytics", icon: ChartLine },
  { href: "/budgets", label: "nav.budgets", icon: PiggyBank },
  { href: "/recurring", label: "nav.recurring", icon: Repeat },
  { href: "/goals", label: "nav.goals", icon: Target },
  { href: "/settings", label: "nav.settings", icon: Settings },
];

/** pathname — адрес в браузере (с префиксом языка), href — уже локализованный путь */
export const isActive = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(href + "/");
