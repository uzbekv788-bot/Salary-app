"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveSheet } from "@/components/ui/responsive-sheet";
import { deleteAccount } from "@/lib/actions/account";
import { authClient } from "@/lib/auth-client";

export function DangerZone({ email }: { email: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [pending, startTransition] = useTransition();
  return (
    <Card className="border-expense/30">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold">Удалить аккаунт</p>
          <p className="text-muted-foreground text-sm">
            Все операции, категории и счета будут удалены навсегда.
          </p>
        </div>
        <Button variant="destructive" size="sm" onClick={() => setOpen(true)}>
          <Trash2 /> Удалить
        </Button>
      </div>
      <ResponsiveSheet
        open={open}
        onOpenChange={setOpen}
        title="Удалить аккаунт навсегда?"
        description="Это действие нельзя отменить. Советуем сначала скачать данные в CSV."
      >
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            startTransition(async () => {
              const r = await deleteAccount(value);
              if (!r.ok) {
                toast.error(r.error);
                return;
              }
              await authClient.signOut().catch(() => {});
              router.replace("/");
              router.refresh();
            });
          }}
        >
          <div className="grid gap-1.5">
            <Label htmlFor="del-email">Для подтверждения введите {email}</Label>
            <Input
              id="del-email"
              type="email"
              autoComplete="off"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>
          <Button
            type="submit"
            variant="destructive"
            disabled={pending || value.trim().toLowerCase() !== email.toLowerCase()}
          >
            {pending ? "Удаляем…" : "Удалить навсегда"}
          </Button>
        </form>
      </ResponsiveSheet>
    </Card>
  );
}
