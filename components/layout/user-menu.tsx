"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { authClient } from "@/lib/auth-client";

export function SignOutButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
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
