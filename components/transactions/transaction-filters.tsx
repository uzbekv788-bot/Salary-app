"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Segmented } from "@/components/ui/segmented";
import type { CategoryDTO, WalletDTO } from "@/lib/queries/finance";
import { useI18n } from "@/components/i18n/locale-provider";

/** Фильтры операций (tasks.md 8.6). Всё состояние — в URL, ссылкой можно поделиться. */
export function TransactionFilters({
  categories,
  wallets,
}: {
  categories: CategoryDTO[];
  wallets: WalletDTO[];
}) {
  const router = useRouter();
  const { t } = useI18n();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get("q") ?? "");

  const set = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(sp);
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    next.delete("limit");
    router.replace(`${pathname}?${next}`, { scroll: false });
  };

  // Поиск с задержкой 300 мс, чтобы не дёргать сервер на каждую букву
  useEffect(() => {
    if (q === (sp.get("q") ?? "")) return;
    const t = setTimeout(() => set({ q: q.trim() || null }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const type = (sp.get("type") ?? "ALL") as "ALL" | "EXPENSE" | "INCOME";
  const shownCats = categories.filter((c) => type === "ALL" || c.type === type);
  const hasFilters = ["type", "category", "wallet", "q"].some((k) => sp.get(k));

  return (
    <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-[minmax(260px,1fr)_1fr_200px_180px_auto] lg:items-center">
      <Segmented
        className="col-span-2 lg:col-span-1"
        label={t("common.type")}
        value={type}
        onChange={(v) => set({ type: v === "ALL" ? null : v, category: null })}
        options={[
          { value: "ALL", label: t("common.all") },
          {
            value: "EXPENSE",
            label: t("common.expense"),
            activeClass: "bg-expense text-expense-foreground",
          },
          {
            value: "INCOME",
            label: t("common.income"),
            activeClass: "bg-income text-income-foreground",
          },
        ]}
      />
      <div className="relative col-span-2 lg:col-span-1">
        <Search
          aria-hidden
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2"
        />
        <Input
          type="search"
          placeholder={t("tx.search")}
          aria-label={t("tx.search")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="pl-10"
        />
      </div>
      <NativeSelect
        aria-label={t("common.category")}
        value={sp.get("category") ?? ""}
        onChange={(e) => set({ category: e.target.value || null })}
      >
        <option value="">{t("tx.allCategories")}</option>
        {shownCats.map((c) => (
          <option key={c.id} value={c.id}>
            {type === "ALL" ? `${c.type === "INCOME" ? "↗" : "↘"} ` : ""}
            {c.name}
          </option>
        ))}
      </NativeSelect>
      <NativeSelect
        aria-label={t("common.wallet")}
        value={sp.get("wallet") ?? ""}
        onChange={(e) => set({ wallet: e.target.value || null })}
      >
        <option value="">{t("tx.allWallets")}</option>
        {wallets.map((w) => (
          <option key={w.id} value={w.id}>
            {w.name}
          </option>
        ))}
      </NativeSelect>
      {hasFilters && (
        <button
          type="button"
          onClick={() => {
            setQ("");
            set({ type: null, category: null, wallet: null, q: null });
          }}
          className="text-muted-foreground hover:bg-foreground/6 focus-visible:ring-ring inline-flex h-11 items-center justify-center gap-1.5 rounded-full px-4 text-sm font-semibold outline-none focus-visible:ring-2"
        >
          <X className="size-4" /> {t("tx.reset")}
        </button>
      )}
    </div>
  );
}
