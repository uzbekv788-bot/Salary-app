"use client";

import { Suspense } from "react";
import { Languages } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { useI18n } from "@/components/i18n/locale-provider";

/** Язык интерфейса (tasks.md 18.1). */
export function LanguageSection() {
  const { t } = useI18n();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Languages className="text-primary size-5" aria-hidden /> {t("settings.language")}
        </CardTitle>
        <Suspense fallback={null}>
          <LanguageSwitcher />
        </Suspense>
      </CardHeader>
      <p className="text-muted-foreground text-sm">{t("settings.languageHint")}</p>
    </Card>
  );
}
