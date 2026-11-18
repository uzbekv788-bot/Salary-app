import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { GoalManager } from "@/components/goals/goal-manager";
import { todayIn } from "@/lib/period";
import { listGoals } from "@/lib/queries/planning";
import { requireUser } from "@/lib/session";

export const metadata = { title: "Цели" };

export default function GoalsPage() {
  return (
    <>
      <PageHeader title="Цели" showAdd={false} />
      <Suspense fallback={<PageSkeleton />}>
        <Content />
      </Suspense>
    </>
  );
}

async function Content() {
  const user = await requireUser();
  return (
    <GoalManager
      goals={await listGoals(user.id)}
      today={todayIn(user.timezone)}
      currency={user.currency}
    />
  );
}
