import Link from "next/link";
import { CloudOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { RetryButton } from "./retry-button";

export const metadata = { title: "Нет подключения" };

/** Запасная страница service worker'а: экран ещё ни разу не открывался с сетью (tasks.md 17.2). */
export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="glass w-full max-w-md rounded-lg">
        <EmptyState
          icon={CloudOff}
          title="Нет подключения к интернету"
          description="Этот экран ещё не сохранён на устройстве. Откройте дашборд — он доступен без сети, а новые операции можно добавлять и офлайн."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <RetryButton />
              <Button asChild variant="secondary">
                <Link href="/dashboard">Дашборд</Link>
              </Button>
            </div>
          }
        />
      </div>
    </main>
  );
}
