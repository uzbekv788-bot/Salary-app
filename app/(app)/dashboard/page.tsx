import { Suspense } from "react";
import { LayoutDashboard } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireUser } from "@/lib/session";

export const metadata = { title: "Дашборд" };

export default function Page({ searchParams }: PageProps<"/dashboard">) {
  return (
    <>
      <PageHeader title="Дашборд" searchParams={searchParams} />
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
        icon={LayoutDashboard}
        title="Раздел в разработке"
        description="KPI, график динамики и структура расходов — шаг 9."
      />
    </Card>
  );
}
