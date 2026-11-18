"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { CircleCheck, Download, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

const standaloneQuery = "(display-mode: standalone)";

/** Установка приложения (tasks.md 17.1): кнопка там, где браузер это умеет, и инструкции для остальных. */
export function InstallSection() {
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
          <Smartphone className="text-primary size-5" aria-hidden /> Приложение на телефоне
        </CardTitle>
      </CardHeader>
      {installed ? (
        <p className="text-income inline-flex items-center gap-2 text-sm font-medium">
          <CircleCheck className="size-4" aria-hidden /> Salary установлен на это устройство
        </p>
      ) : (
        <div className="grid gap-3 text-sm">
          <p className="text-muted-foreground">
            Установите Salary на главный экран: он откроется как обычное приложение, а операции
            можно добавлять даже без интернета — они отправятся, когда появится связь.
          </p>
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
              <Download /> Установить
            </Button>
          )}
          <ul className="text-muted-foreground grid gap-1.5">
            <li>
              <b className="text-foreground">iPhone (Safari):</b> «Поделиться» → «На экран „Домой“»
            </li>
            <li>
              <b className="text-foreground">Android (Chrome):</b> меню ⋮ → «Установить приложение»
            </li>
            <li>
              <b className="text-foreground">Компьютер (Chrome, Edge):</b> значок установки справа в
              адресной строке
            </li>
          </ul>
          <p className="text-muted-foreground text-[13px]">
            Установка работает, когда сайт открыт по HTTPS (после публикации), и на localhost.
          </p>
        </div>
      )}
    </Card>
  );
}
