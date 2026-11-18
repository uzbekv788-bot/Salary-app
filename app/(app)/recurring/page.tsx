import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { RecurringManager } from "@/components/recurring/recurring-manager";
import { todayIn } from "@/lib/period";
import { listCategories, listWallets } from "@/lib/queries/finance";
import { listRecurring } from "@/lib/queries/planning";
import { requireUser } from "@/lib/session";

export const metadata = { title: "Регулярные платежи" };

export default function RecurringPage() {
  return (
    <>
      <PageHeader title="Регулярные платежи" showAdd={false} />
      <Suspense fallback={<PageSkeleton />}>
        <Content />
      </Suspense>
    </>
  );
}

async function Content() {
  const user = await requireUser();
  const [rules, categories, wallets] = await Promise.all([
    listRecurring(user.id),
    listCategories(user.id),
    listWallets(user.id),
  ]);
  return (
    <RecurringManager
      rules={rules}
      categories={categories}
      wallets={wallets}
      today={todayIn(user.timezone)}
      currency={user.currency}
    />
  );
}
