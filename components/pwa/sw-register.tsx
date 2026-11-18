"use client";

import { useEffect } from "react";

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
declare global {
  interface Window {
    __salaryInstall?: InstallEvent | null;
  }
}

/**
 * Регистрирует service worker (только в production: в dev он мешал бы горячей перезагрузке)
 * и запоминает событие установки для кнопки «Установить» в настройках.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      window.__salaryInstall = e as InstallEvent;
      window.dispatchEvent(new Event("salary:installable"));
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    const enabled = process.env.NODE_ENV === "production" || process.env.NEXT_PUBLIC_SW_DEV === "1";
    if (enabled && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch(() => {});
    }
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);
  return null;
}

/** Удалить сохранённые офлайн-страницы (при выходе из аккаунта). */
export async function clearOfflineData() {
  try {
    navigator.serviceWorker?.controller?.postMessage({ type: "clear-user-data" });
    const keys = await caches.keys();
    await Promise.all(
      keys.filter((k) => k.startsWith("salary-pages")).map((k) => caches.delete(k)),
    );
  } catch {
    /* Cache API недоступен — нечего чистить */
  }
}
