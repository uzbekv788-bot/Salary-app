"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CategoryIcon } from "@/components/ui/category-icon";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveCategory } from "@/lib/actions/finance";
import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  categoryColorVar,
  type CategoryColor,
} from "@/lib/design/category-palette";
import type { CategoryDTO } from "@/lib/queries/finance";
import { cn } from "@/lib/utils";
import { useDesktopAutoFocus } from "@/lib/hooks/use-desktop-autofocus";

/** Создание/редактирование категории с предпросмотром (tasks.md 7.3). */
export function CategoryForm({
  type,
  initial,
  onDone,
}: {
  type: "INCOME" | "EXPENSE";
  initial: CategoryDTO | null;
  onDone: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const focusRef = useDesktopAutoFocus<HTMLInputElement>();
  const [icon, setIcon] = useState(initial?.icon ?? "ShoppingBag");
  const [color, setColor] = useState<CategoryColor>((initial?.color as CategoryColor) ?? "emerald");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await saveCategory(
        { name, type: initial?.type ?? type, icon, color },
        initial?.id,
      );
      if (!res.ok) {
        setErrors(res.fieldErrors ?? { form: res.error });
        return;
      }
      toast.success(initial ? "Категория изменена" : "Категория создана");
      onDone();
    });
  };

  return (
    <form onSubmit={submit} noValidate className="grid gap-4">
      <div className="bg-foreground/4 flex items-center gap-3 rounded-md p-3">
        <CategoryIcon icon={icon} color={color} />
        <span className="font-semibold">{name || "Название категории"}</span>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="cat-name">Название</Label>
        <Input
          id="cat-name"
          value={name}
          maxLength={40}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={Boolean(errors.name)}
          ref={focusRef}
        />
        {errors.name && <p className="text-expense text-[13px]">{errors.name}</p>}
      </div>
      <fieldset>
        <legend className="text-muted-foreground mb-2 text-[13px] font-medium">Цвет</legend>
        <div role="radiogroup" aria-label="Цвет" className="flex flex-wrap gap-2">
          {CATEGORY_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={color === c}
              aria-label={c}
              onClick={() => setColor(c)}
              className={cn(
                "focus-visible:ring-ring size-8 rounded-full outline-none focus-visible:ring-2",
                color === c && "ring-foreground ring-offset-background ring-2 ring-offset-2",
              )}
              style={{ background: categoryColorVar(c) }}
            />
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="text-muted-foreground mb-2 text-[13px] font-medium">Иконка</legend>
        <div
          role="radiogroup"
          aria-label="Иконка"
          className="grid max-h-48 grid-cols-7 gap-1 overflow-y-auto p-0.5 sm:grid-cols-9"
        >
          {Object.keys(CATEGORY_ICONS).map((name) => (
            <button
              key={name}
              type="button"
              role="radio"
              aria-checked={icon === name}
              aria-label={name}
              onClick={() => setIcon(name)}
              className={cn(
                "focus-visible:ring-ring flex items-center justify-center rounded-md p-1 outline-none focus-visible:ring-2",
                icon === name ? "bg-primary/12 ring-primary ring-2" : "hover:bg-foreground/5",
              )}
            >
              <CategoryIcon icon={name} color={icon === name ? color : "slate"} size="sm" />
            </button>
          ))}
        </div>
      </fieldset>
      {errors.form && (
        <p role="alert" className="bg-expense/10 text-expense rounded-sm px-3 py-2 text-sm">
          {errors.form}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Сохраняем…" : initial ? "Сохранить" : "Создать"}
      </Button>
    </form>
  );
}
