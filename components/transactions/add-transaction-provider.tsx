"use client";

import { createContext, use, useCallback, useEffect, useMemo, useState } from "react";
import type { TransactionDTO } from "@/lib/queries/finance";

type Ctx = {
  open: boolean;
  editing: TransactionDTO | null;
  setOpen: (open: boolean) => void;
  /** Без аргумента — новая операция, с операцией — редактирование. */
  openForm: (tx?: TransactionDTO) => void;
};
const AddTransactionContext = createContext<Ctx | null>(null);

/** Глобальная форма операции (tasks.md 8.4): кнопка «+» откуда угодно или клавиша N. */
export function AddTransactionProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpenState] = useState(false);
  const [editing, setEditing] = useState<TransactionDTO | null>(null);

  const openForm = useCallback((tx?: TransactionDTO) => {
    setEditing(tx ?? null);
    setOpenState(true);
  }, []);
  const setOpen = useCallback((v: boolean) => setOpenState(v), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if ((k !== "n" && k !== "т") || e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest("input, textarea, select, [contenteditable=true], [role=dialog]")) return;
      e.preventDefault();
      openForm();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openForm]);

  const value = useMemo(
    () => ({ open, editing, setOpen, openForm }),
    [open, editing, setOpen, openForm],
  );
  return <AddTransactionContext value={value}>{children}</AddTransactionContext>;
}

export function useAddTransaction() {
  const ctx = use(AddTransactionContext);
  if (!ctx) throw new Error("useAddTransaction must be used within AddTransactionProvider");
  return ctx;
}
