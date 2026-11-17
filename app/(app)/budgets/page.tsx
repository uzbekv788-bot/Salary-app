import { Suspense } from "react";
import { PiggyBank } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireUser } from "@/lib/session";

export const metadata = { title: "Бюджеты" };

export default function Page() {
  return (
    <>
      <PageHeader title="Бюджеты" />
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
        icon={PiggyBank}
        title="Раздел в разработке"
        description="Лимиты по категориям — шаг 11."
      />
    </Card>
  );
}
