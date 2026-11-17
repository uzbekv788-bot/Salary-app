import { Suspense } from "react";
import { Tags } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireUser } from "@/lib/session";

export const metadata = { title: "Категории" };

export default function Page() {
  return (
    <>
      <PageHeader title="Категории" />
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
        icon={Tags}
        title="Раздел в разработке"
        description="Управление категориями — шаг 7."
      />
    </Card>
  );
}
