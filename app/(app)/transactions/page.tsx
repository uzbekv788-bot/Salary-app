import { Suspense } from "react";
import { ArrowLeftRight } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireUser } from "@/lib/session";

export const metadata = { title: "Операции" };

export default function Page({ searchParams }: PageProps<"/transactions">) {
  return (
    <>
      <PageHeader title="Операции" searchParams={searchParams} />
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
        icon={ArrowLeftRight}
        title="Раздел в разработке"
        description="Список операций с фильтрами — шаг 8."
      />
    </Card>
  );
}
