"use client";

import { LogOut } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { clearOfflineData } from "@/components/pwa/sw-register";
import { listQueued, removeQueued } from "@/lib/offline-queue";
import { useI18n } from "@/components/i18n/locale-provider";
import { useLocaleRouter } from "@/components/i18n/use-locale-router";

/**
 * Выход: предупреждаем о неотправленных офлайн-операциях и удаляем
 * сохранённые на устройстве страницы с личными данными (tasks.md 17.2).
 */
export function SignOutButton({ compact = false, userId }: { compact?: boolean; userId: string }) {
  const router = useLocaleRouter();
  const { t } = useI18n();
  return (
    <button
      type="button"
      onClick={async () => {
        const pending = await listQueued(userId);
        if (pending.length) {
          const ok = window.confirm(t.tp("nav.signOutPending", pending.length));
          if (!ok) return;
          await Promise.all(pending.map((p) => removeQueued(p.clientId)));
        }
        await clearOfflineData();
        await authClient.signOut();
        router.replace("/login");
        router.refresh();
      }}
      aria-label={t("nav.signOut")}
      title={t("nav.signOut")}
      className="text-muted-foreground hover:bg-foreground/6 hover:text-foreground focus-visible:ring-ring inline-flex size-9 shrink-0 items-center justify-center rounded-full transition-colors outline-none focus-visible:ring-2"
    >
      <LogOut className="size-4" />
      {compact ? null : <span className="sr-only">{t("nav.signOut")}</span>}
    </button>
  );
}
