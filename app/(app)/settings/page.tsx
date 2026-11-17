import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { WalletsSection } from "@/components/settings/wallets-section";
import { listWallets } from "@/lib/queries/finance";
import { requireUser } from "@/lib/session";

export const metadata = { title: "Настройки" };

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Настройки" showAdd={false} />
      <Suspense fallback={<PageSkeleton />}>
        <Content />
      </Suspense>
    </>
  );
}

async function Content() {
  const user = await requireUser();
  const wallets = await listWallets(user.id, { includeArchived: true });
  return (
    <div className="grid max-w-3xl gap-5">
      <WalletsSection wallets={wallets} currency={user.currency} />
    </div>
  );
}
