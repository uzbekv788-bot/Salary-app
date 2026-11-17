import { Suspense } from "react";
import { redirect } from "next/navigation";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/session";

export const metadata = { title: "Начало работы" };

export default function OnboardingPage() {
  return (
    <div className="glass w-full max-w-[560px] animate-[rise-in_250ms_var(--ease-out-soft)] rounded-lg p-6 sm:p-8">
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <Wizard />
      </Suspense>
    </div>
  );
}

async function Wizard() {
  const user = await requireUser({ allowNotOnboarded: true });
  if (user.onboarded) redirect("/dashboard");
  return <OnboardingWizard name={user.name} />;
}
