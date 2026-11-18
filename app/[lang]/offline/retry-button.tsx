"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/i18n/locale-provider";

export function RetryButton() {
  const { t } = useI18n();
  return (
    <Button onClick={() => window.location.reload()}>
      <RefreshCw /> {t("common.retry")}
    </Button>
  );
}
