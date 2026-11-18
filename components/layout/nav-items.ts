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

export type NavItem = { href: string; label: string; icon: LucideIcon };

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Дашборд", icon: LayoutDashboard },
  { href: "/transactions", label: "Операции", icon: ArrowLeftRight },
  { href: "/categories", label: "Категории", icon: Tags },
  { href: "/analytics", label: "Аналитика", icon: ChartLine },
  { href: "/budgets", label: "Бюджеты", icon: PiggyBank },
  { href: "/recurring", label: "Регулярные", icon: Repeat },
  { href: "/goals", label: "Цели", icon: Target },
  { href: "/settings", label: "Настройки", icon: Settings },
];

export const isActive = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(href + "/");
