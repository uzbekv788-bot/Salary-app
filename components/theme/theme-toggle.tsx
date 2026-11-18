"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n/locale-provider";
import type { TKey } from "@/lib/i18n/core";

const options = [
  { value: "light", label: "theme.light", icon: Sun },
  { value: "dark", label: "theme.dark", icon: Moon },
  { value: "system", label: "theme.system", icon: Monitor },
] as const satisfies readonly { value: string; label: TKey; icon: unknown }[];

const subscribe = () => () => {};

/** Сегментированный переключатель темы: светлая / тёмная / системная. */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const { t } = useI18n();
  // Тема известна только в браузере — до гидрации ничего не выделяем.
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

  return (
    <div
      role="radiogroup"
      aria-label={t("theme.label")}
      className={cn("glass inline-flex rounded-full p-1", className)}
    >
      {options.map(({ value, label, icon: Icon }) => {
        const active = mounted && theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={t(label)}
            title={t(label)}
            onClick={() => setTheme(value)}
            className={cn(
              "text-muted-foreground focus-visible:ring-ring inline-flex size-8 items-center justify-center rounded-full transition-colors outline-none focus-visible:ring-2",
              active ? "bg-primary text-primary-foreground" : "hover:bg-foreground/6",
            )}
          >
            <Icon className="size-4" />
          </button>
        );
      })}
    </div>
  );
}
