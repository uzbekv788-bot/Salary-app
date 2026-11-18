"use client";

/**
 * Очередь операций, введённых без сети (tasks.md 17.3). Хранится в IndexedDB устройства,
 * переживает закрытие вкладки. Каждая запись помнит userId — чужие записи (другой аккаунт
 * на том же устройстве) не отправляются от имени текущего пользователя.
 */
import type { TransactionInput } from "@/lib/validators/finance";

export type QueuedTx = {
  clientId: string;
  userId: string;
  input: TransactionInput & { clientId: string };
  repeat?: "WEEKLY" | "MONTHLY" | "YEARLY";
  /** Для показа в плашке: «Кафе · −350 ₽» */
  label: string;
  createdAt: number;
};

const DB = "salary-offline";
const STORE = "transactions";
const EVENT = "salary:queue-changed";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "clientId" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await open();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => {
      db.close();
      resolve(req.result);
    };
    tx.onerror = () => reject(tx.error);
  });
}

const changed = () => window.dispatchEvent(new Event(EVENT));

export async function enqueue(item: Omit<QueuedTx, "createdAt">) {
  await run("readwrite", (s) => s.put({ ...item, createdAt: Date.now() }));
  changed();
}

export async function listQueued(userId: string): Promise<QueuedTx[]> {
  try {
    const all = (await run("readonly", (s) => s.getAll())) as QueuedTx[];
    return all.filter((x) => x.userId === userId).sort((a, b) => a.createdAt - b.createdAt);
  } catch {
    return []; // приватный режим / IndexedDB недоступна
  }
}

export async function removeQueued(clientId: string) {
  await run("readwrite", (s) => s.delete(clientId));
  changed();
}

export function onQueueChange(cb: () => void) {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}

/** Сетевая ошибка (нет связи), а не ответ сервера: такую запись нужно оставить в очереди. */
export function isNetworkError(e: unknown) {
  return (
    e instanceof TypeError || (e instanceof Error && /fetch|network|load failed/i.test(e.message))
  );
}

export const newClientId = () => crypto.randomUUID();
