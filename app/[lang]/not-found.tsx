import Link from "@/components/i18n/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { getI18n } from "@/lib/i18n/server";

export default async function NotFound() {
  const { t } = await getI18n();
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="glass w-full max-w-md rounded-lg">
        <EmptyState
          icon={Compass}
          title={t("pageError.notFound")}
          description={t("pageError.notFoundText")}
          action={
            <Button asChild>
              <Link href="/dashboard">{t("pageError.home")}</Link>
            </Button>
          }
        />
      </div>
    </main>
  );
}
