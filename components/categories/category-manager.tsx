"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Archive, ArchiveRestore, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CategoryIcon } from "@/components/ui/category-icon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { ResponsiveSheet } from "@/components/ui/responsive-sheet";
import { Segmented } from "@/components/ui/segmented";
import { CategoryForm } from "@/components/categories/category-form";
import { deleteCategory, setCategoryArchived } from "@/lib/actions/finance";
import type { CategoryDTO } from "@/lib/queries/finance";
import { useI18n } from "@/components/i18n/locale-provider";

/** Страница категорий (tasks.md 7.4): вкладки, CRUD, архив, удаление с переносом операций. */
export function CategoryManager({ categories }: { categories: CategoryDTO[] }) {
  const { t } = useI18n();
  const [type, setType] = useState<"EXPENSE" | "INCOME">("EXPENSE");
  const [editing, setEditing] = useState<CategoryDTO | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<CategoryDTO | null>(null);
  const [moveTo, setMoveTo] = useState("");
  const [pending, startTransition] = useTransition();

  const ofType = categories.filter((c) => c.type === type);
  const active = ofType.filter((c) => !c.archived);
  const archived = ofType.filter((c) => c.archived);

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, success: string) =>
    startTransition(async () => {
      const res = await fn();
      if (res.ok) toast.success(success);
      else toast.error(t.dyn(res.error ?? "auth.err.generic"));
    });

  const row = (c: CategoryDTO) => (
    <li key={c.id} className="flex items-center gap-3 rounded-md px-2 py-2">
      <CategoryIcon icon={c.icon} color={c.color} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{c.name}</p>
        <p className="text-muted-foreground text-[13px]">{t.tp("cat.txCount", c.txCount)}</p>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={t("cat.actions", { name: c.name })}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onSelect={() => {
              setEditing(c);
              setFormOpen(true);
            }}
          >
            <Pencil /> {t("common.edit")}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={pending}
            onSelect={() =>
              run(
                () => setCategoryArchived(c.id, !c.archived),
                c.archived ? t("cat.restored") : t("cat.archived"),
              )
            }
          >
            {c.archived ? (
              <>
                <ArchiveRestore /> {t("cat.unarchive")}
              </>
            ) : (
              <>
                <Archive /> {t("cat.archive")}
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-expense"
            onSelect={() => {
              setDeleting(c);
              setMoveTo("");
            }}
          >
            <Trash2 className="!text-expense" /> {t("common.delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );

  const targets = deleting
    ? categories.filter((c) => c.type === deleting.type && c.id !== deleting.id)
    : [];

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Segmented
          label={t("cat.typeLabel")}
          className="max-w-xs"
          value={type}
          onChange={setType}
          options={[
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
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus /> {t("cat.new")}
        </Button>
      </div>

      <Card className="p-2 sm:p-3">
        {active.length ? (
          <ul className="grid gap-x-4 md:grid-cols-2">{active.map(row)}</ul>
        ) : (
          <p className="text-muted-foreground p-6 text-center text-sm">{t("cat.noneActive")}</p>
        )}
      </Card>

      {archived.length > 0 && (
        <details className="mt-5">
          <summary className="text-muted-foreground mb-2 cursor-pointer text-sm font-semibold">
            {t("cat.archiveSection", { n: archived.length })}
          </summary>
          <Card className="p-2 opacity-80 sm:p-3">
            <ul className="grid gap-x-4 md:grid-cols-2">{archived.map(row)}</ul>
          </Card>
        </details>
      )}

      <ResponsiveSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        title={
          editing
            ? t("cat.editTitle")
            : type === "EXPENSE"
              ? t("cat.newExpense")
              : t("cat.newIncome")
        }
      >
        <CategoryForm
          key={`${editing?.id ?? "new"}-${formOpen}`}
          type={type}
          initial={editing}
          onDone={() => setFormOpen(false)}
        />
      </ResponsiveSheet>

      <ResponsiveSheet
        open={Boolean(deleting)}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={t("cat.deleteTitle", { name: deleting?.name ?? "" })}
      >
        {deleting && (
          <div className="grid gap-4">
            {deleting.txCount > 0 ? (
              <>
                <p className="text-muted-foreground text-sm">
                  {t("cat.inUse", { count: t.tp("cat.txCount", deleting.txCount) })}
                </p>
                <div className="grid gap-1.5">
                  <Label htmlFor="move-to">{t("cat.moveTo")}</Label>
                  <NativeSelect
                    id="move-to"
                    value={moveTo}
                    onChange={(e) => setMoveTo(e.target.value)}
                  >
                    <option value="">{t("cat.pick")}</option>
                    {targets.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground text-sm">{t("cat.safe")}</p>
            )}
            <Button
              variant="destructive"
              disabled={pending || (deleting.txCount > 0 && !moveTo)}
              onClick={() =>
                startTransition(async () => {
                  const res = await deleteCategory(deleting.id, moveTo || undefined);
                  if (!res.ok) {
                    toast.error(t.dyn(res.error));
                    return;
                  }
                  toast.success(t("cat.deleted"));
                  setDeleting(null);
                })
              }
            >
              <Trash2 /> {deleting.txCount > 0 ? t("cat.moveAndDelete") : t("common.delete")}
            </Button>
          </div>
        )}
      </ResponsiveSheet>
    </>
  );
}
