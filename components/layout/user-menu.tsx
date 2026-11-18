"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { clearOfflineData } from "@/components/pwa/sw-register";
import { listQueued, removeQueued } from "@/lib/offline-queue";

/**
 * Выход: предупреждаем о неотправленных офлайн-операциях и удаляем
 * сохранённые на устройстве страницы с личными данными (tasks.md 17.2).
 */
export function SignOutButton({ compact = false, userId }: { compact?: boolean; userId: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        const pending = await listQueued(userId);
        if (pending.length) {
          const ok = window.confirm(
            `${pending.length} операц. ещё не отправлены — они сохранены только на этом устройстве. Выйти и удалить их?`,
          );
          if (!ok) return;
          await Promise.all(pending.map((p) => removeQueued(p.clientId)));
        }
        await clearOfflineData();
        await authClient.signOut();
        router.replace("/login");
        router.refresh();
      }}
      aria-label="Выйти"
      title="Выйти"
      className="text-muted-foreground hover:bg-foreground/6 hover:text-foreground focus-visible:ring-ring inline-flex size-9 shrink-0 items-center justify-center rounded-full transition-colors outline-none focus-visible:ring-2"
    >
      <LogOut className="size-4" />
      {compact ? null : <span className="sr-only">Выйти</span>}
    </button>
  );
}
