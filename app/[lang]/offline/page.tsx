import Link from "@/components/i18n/link";
import { CloudOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { RetryButton } from "./retry-button";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("meta.offline") };
}

/** Запасная страница service worker'а: экран ещё ни разу не открывался с сетью (tasks.md 17.2). */
export default async function OfflinePage() {
  const { t } = await getI18n();
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="glass w-full max-w-md rounded-lg">
        <EmptyState
          icon={CloudOff}
          title={t("offline.title")}
          description={t("offline.text")}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <RetryButton />
              <Button asChild variant="secondary">
                <Link href="/dashboard">{t("nav.dashboard")}</Link>
              </Button>
            </div>
          }
        />
      </div>
    </main>
  );
}
