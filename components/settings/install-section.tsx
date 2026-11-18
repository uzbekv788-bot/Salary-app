"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { CircleCheck, Download, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/components/i18n/locale-provider";

const standaloneQuery = "(display-mode: standalone)";

/** Установка приложения (tasks.md 17.1): кнопка там, где браузер это умеет, и инструкции для остальных. */
export function InstallSection() {
  const { t } = useI18n();
  const installed = useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(standaloneQuery);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(standaloneQuery).matches,
    () => false,
  );
  const [canPrompt, setCanPrompt] = useState(false);

  useEffect(() => {
    const update = () => setCanPrompt(Boolean(window.__salaryInstall));
    update();
    window.addEventListener("salary:installable", update);
    return () => window.removeEventListener("salary:installable", update);
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="text-primary size-5" aria-hidden /> {t("settings.install")}
        </CardTitle>
      </CardHeader>
      {installed ? (
        <p className="text-income inline-flex items-center gap-2 text-sm font-medium">
          <CircleCheck className="size-4" aria-hidden /> {t("settings.installed")}
        </p>
      ) : (
        <div className="grid gap-3 text-sm">
          <p className="text-muted-foreground">{t("settings.installLead")}</p>
          {canPrompt && (
            <Button
              className="justify-self-start"
              onClick={async () => {
                const e = window.__salaryInstall;
                if (!e) return;
                await e.prompt();
                await e.userChoice;
                window.__salaryInstall = null;
                setCanPrompt(false);
              }}
            >
              <Download /> {t("settings.installBtn")}
            </Button>
          )}
          <ul className="text-muted-foreground grid gap-1.5">
            <li>
              <b className="text-foreground">{t("settings.iphone")}</b> {t("settings.iphoneHow")}
            </li>
            <li>
              <b className="text-foreground">{t("settings.android")}</b> {t("settings.androidHow")}
            </li>
            <li>
              <b className="text-foreground">{t("settings.desktop")}</b> {t("settings.desktopHow")}
            </li>
          </ul>
          <p className="text-muted-foreground text-[13px]">{t("settings.installNote")}</p>
        </div>
      )}
    </Card>
  );
}
