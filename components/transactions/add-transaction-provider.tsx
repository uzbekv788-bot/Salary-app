"use client";

import { createContext, use, useCallback, useEffect, useMemo, useState } from "react";

type Ctx = { open: boolean; setOpen: (open: boolean) => void; openForm: () => void };
const AddTransactionContext = createContext<Ctx | null>(null);

/**
 * Глобальное состояние формы «Добавить операцию» (tasks.md 8.4):
 * открывается кнопкой «+» из любого места или клавишей N.
 */
export function AddTransactionProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const openForm = useCallback(() => setOpen(true), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "n" && e.key.toLowerCase() !== "т") return;
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest("input, textarea, select, [contenteditable=true], [role=dialog]")) return;
      e.preventDefault();
      setOpen(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const value = useMemo(() => ({ open, setOpen, openForm }), [open, openForm]);
  return <AddTransactionContext value={value}>{children}</AddTransactionContext>;
}

export function useAddTransaction() {
  const ctx = use(AddTransactionContext);
  if (!ctx) throw new Error("useAddTransaction must be used within AddTransactionProvider");
  return ctx;
}
