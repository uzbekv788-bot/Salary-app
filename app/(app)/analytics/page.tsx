import { Suspense } from "react";
import { ChartLine } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireUser } from "@/lib/session";

export const metadata = { title: "Аналитика" };

export default function Page({ searchParams }: PageProps<"/analytics">) {
  return (
    <>
      <PageHeader title="Аналитика" searchParams={searchParams} />
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
        icon={ChartLine}
        title="Раздел в разработке"
        description="Сравнение месяцев и топ категорий — шаг 10."
      />
    </Card>
  );
}
