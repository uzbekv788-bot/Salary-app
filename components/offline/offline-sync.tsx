"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CloudOff, RefreshCw } from "lucide-react";
import { saveTransaction } from "@/lib/actions/finance";
import {
  isNetworkError,
  listQueued,
  onQueueChange,
  removeQueued,
  type QueuedTx,
} from "@/lib/offline-queue";

/** Есть ли сеть (события online/offline браузера). */
export function useOnline() {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener("online", cb);
      window.addEventListener("offline", cb);
      return () => {
        window.removeEventListener("online", cb);
        window.removeEventListener("offline", cb);
      };
    },
    () => navigator.onLine,
    () => true,
  );
}

/**
 * Фоновая отправка офлайн-очереди (tasks.md 17.3) и плашка состояния:
 * при появлении сети, при возврате на вкладку и при загрузке страницы.
 */
export function OfflineSync({ userId }: { userId: string }) {
  const online = useOnline();
  const router = useRouter();
  const [queue, setQueue] = useState<QueuedTx[]>([]);
  const [syncing, setSyncing] = useState(false);
  const busy = useRef(false);

  const reload = useCallback(() => {
    listQueued(userId).then(setQueue);
  }, [userId]);

  const sync = useCallback(async () => {
    if (busy.current || !navigator.onLine) return;
    const items = await listQueued(userId);
    if (!items.length) return;
    busy.current = true;
    setSyncing(true);
    let sent = 0;
    try {
      for (const item of items) {
        try {
          const r = await saveTransaction(item.input, undefined, item.repeat);
          await removeQueued(item.clientId);
          if (r.ok) sent++;
          // Сервер отказал по существу (например, категорию удалили) — повтор не поможет
          else toast.error(`Не удалось сохранить «${item.label}»: ${r.error}`, { duration: 10000 });
        } catch (e) {
          if (isNetworkError(e)) break; // сеть снова пропала — попробуем позже
          throw e;
        }
      }
    } finally {
      busy.current = false;
      setSyncing(false);
    }
    if (sent) {
      toast.success(`Отправлено операций, введённых без сети: ${sent}`);
      router.refresh();
    }
  }, [userId, router]);

  // Заранее сохраняем главные экраны, чтобы установленное приложение открывалось без сети
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    try {
      if (sessionStorage.getItem("salary:warmed") === userId) return;
      sessionStorage.setItem("salary:warmed", userId);
    } catch {
      /* без sessionStorage просто прогреем ещё раз */
    }
    navigator.serviceWorker.ready
      .then((r) =>
        r.active?.postMessage({
          type: "warm",
          urls: ["/dashboard", "/transactions", "/budgets", "/goals"],
        }),
      )
      .catch(() => {});
  }, [userId]);

  useEffect(() => {
    reload();
    const off = onQueueChange(reload);
    return off;
  }, [reload]);

  useEffect(() => {
    // sync() асинхронна: состояние меняется только после await (чтение IndexedDB), каскадного рендера нет
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (online) sync();
  }, [online, sync]);

  useEffect(() => {
    const onVisible = () => document.visibilityState === "visible" && sync();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [sync]);

  const pending = queue.length;
  if (online && pending === 0) return null;

  return (
    <>
      {(!online || pending > 0) && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed inset-x-0 bottom-[88px] z-40 flex justify-center px-4 md:top-2 md:bottom-auto md:left-[112px] lg:left-[296px]"
        >
          <div className="glass-strong pointer-events-auto inline-flex max-w-full items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium">
            {syncing ? (
              <RefreshCw className="size-4 shrink-0 animate-spin" aria-hidden />
            ) : (
              <CloudOff className="text-warning size-4 shrink-0" aria-hidden />
            )}
            <span className="truncate">
              {!online ? "Нет сети" : syncing ? "Отправляем" : "Ждут отправки"}
              {pending > 0 &&
                ` · ${pending} ${pending === 1 ? "операция" : pending < 5 ? "операции" : "операций"} на устройстве`}
              {!online && pending === 0 && " · новые операции сохранятся на устройстве"}
            </span>
            {online && pending > 0 && !syncing && (
              <button
                type="button"
                onClick={sync}
                className="text-primary font-semibold underline-offset-2 hover:underline"
              >
                Отправить
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
