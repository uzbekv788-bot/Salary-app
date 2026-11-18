import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { GoalManager } from "@/components/goals/goal-manager";
import { todayIn } from "@/lib/period";
import { listGoals } from "@/lib/queries/planning";
import { requireUser } from "@/lib/session";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("goal.title") };
}

export default async function GoalsPage() {
  const { t } = await getI18n();
  return (
    <>
      <PageHeader title={t("goal.title")} showAdd={false} />
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
