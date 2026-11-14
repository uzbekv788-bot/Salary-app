"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

const options = [
  { value: "light", label: "Светлая тема", icon: Sun },
  { value: "dark", label: "Тёмная тема", icon: Moon },
  { value: "system", label: "Как в системе", icon: Monitor },
] as const;

const subscribe = () => () => {};

/** Сегментированный переключатель темы: светлая / тёмная / системная. */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  // Тема известна только в браузере — до гидрации ничего не выделяем.
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

  return (
    <div
      role="radiogroup"
      aria-label="Тема оформления"
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
            aria-label={label}
            title={label}
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
