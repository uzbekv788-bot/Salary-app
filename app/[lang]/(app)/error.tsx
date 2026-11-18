"use client";

import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { useI18n } from "@/components/i18n/locale-provider";

export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useI18n();
  return (
    <Card>
      <EmptyState
        icon={TriangleAlert}
        title={t("pageError.title")}
        description={t("pageError.description")}
        action={<Button onClick={reset}>{t("common.retry")}</Button>}
      />
    </Card>
  );
}
