import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { DangerZone } from "@/components/settings/danger-zone";
import { DataSection } from "@/components/settings/data-section";
import { InstallSection } from "@/components/settings/install-section";
import { ProfileSection } from "@/components/settings/profile-section";
import { WalletsSection } from "@/components/settings/wallets-section";
import { todayIn } from "@/lib/period";
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
      <ProfileSection
        name={user.name}
        email={user.email}
        currency={user.currency}
        timezone={user.timezone}
      />
      <WalletsSection wallets={wallets} currency={user.currency} />
      <DataSection
        wallets={wallets}
        currency={user.currency}
        year={todayIn(user.timezone).slice(0, 4)}
      />
      <InstallSection />
      <DangerZone email={user.email} />
    </div>
  );
}
