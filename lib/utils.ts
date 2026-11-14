import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Склеивает классы Tailwind и убирает конфликтующие (shadcn-конвенция). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
