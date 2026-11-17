import { Suspense } from "react";
import { Settings } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireUser } from "@/lib/session";

export const metadata = { title: "Настройки" };

export default function Page() {
  return (
    <>
      <PageHeader title="Настройки" />
      <Suspense fallback={<PageSkeleton />}>
        <Content />
      </Suspense>
    </>
  );
}

async function Content() {
  await requireUser();
  return (
    <Card>
      <EmptyState
        icon={Settings}
        title="Раздел в разработке"
        description="Профиль, счета, импорт и экспорт — шаг 12."
      />
    </Card>
  );
}
