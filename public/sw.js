/* Service worker Salary (tasks.md 17.2). Без сборщика — обычный JS, отдаётся как есть. */
const VERSION = "v2";
const STATIC = `salary-static-${VERSION}`;
const PAGES = `salary-pages-${VERSION}`;
const OFFLINE_URL = "/offline";

/**
 * Страница без своих JS/CSS не оживёт офлайн. Находим в HTML (включая данные RSC внутри)
 * все ссылки на /_next/static/… и кэшируем их вместе со страницей.
 */
async function cacheAssetsFrom(html) {
  const urls = [...new Set(html.match(/\/_next\/static\/[^"'\s\\)]+?\.(?:js|css|woff2)/g) || [])];
  const cache = await caches.open(STATIC);
  await Promise.all(
    urls.map(async (u) => {
      if (await cache.match(u)) return;
      try {
        const res = await fetch(u);
        if (res.ok) await cache.put(u, res);
      } catch {
        /* нет сети — докачаем в следующий раз */
      }
    }),
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC);
      await cache.addAll(["/icons/icon-192.png"]);
      const res = await fetch(OFFLINE_URL);
      await cache.put(OFFLINE_URL, res.clone());
      await cacheAssetsFrom(await res.text());
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith("salary-") && k !== STATIC && k !== PAGES)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

const isStatic = (url) =>
  url.pathname.startsWith("/_next/static/") ||
  url.pathname.startsWith("/icons/") ||
  /\.(?:woff2?|png|svg|webp|ico)$/.test(url.pathname);

/** Кэшируем только полноценные HTML-страницы приложения (не редиректы на /login, не ошибки). */
async function cachePage(request, response) {
  if (!response.ok || response.redirected || response.type !== "basic") return;
  if (!(response.headers.get("content-type") || "").includes("text/html")) return;
  const cache = await caches.open(PAGES);
  await cache.put(request.url.split("#")[0], response.clone());
  await cacheAssetsFrom(await response.text());
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname === "/sw.js") return;
  // RSC-запросы клиентской навигации не кэшируем: без сети Next.js сам перейдёт на полную загрузку страницы
  if (req.headers.get("RSC") === "1" || url.searchParams.has("_rsc")) return;

  if (isStatic(url)) {
    // Файлы с хешем в имени не меняются — сначала кэш
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) caches.open(STATIC).then((c) => c.put(req, res.clone()));
            return res;
          }),
      ),
    );
    return;
  }

  if (req.mode === "navigate") {
    // Страницы — сначала сеть (всегда свежие данные), без сети — последняя сохранённая копия
    event.respondWith(
      fetch(req)
        .then((res) => {
          event.waitUntil(cachePage(req, res.clone()));
          return res;
        })
        .catch(async () => {
          const pages = await caches.open(PAGES);
          return (
            (await pages.match(req.url.split("#")[0])) ||
            (await pages.match(new URL(url.pathname, url.origin).href)) ||
            (await caches.match(OFFLINE_URL))
          );
        }),
    );
  }
});

self.addEventListener("message", (event) => {
  const data = event.data || {};
  // Выход из аккаунта: удаляем сохранённые страницы с личными данными
  if (data.type === "clear-user-data") event.waitUntil(caches.delete(PAGES));
  // После входа заранее сохраняем главные экраны, чтобы приложение открывалось без сети
  if (data.type === "warm" && Array.isArray(data.urls)) {
    event.waitUntil(
      Promise.all(
        data.urls.map((u) =>
          fetch(u, { credentials: "same-origin" })
            .then((res) => cachePage(new Request(new URL(u, self.location.origin).href), res))
            .catch(() => {}),
        ),
      ),
    );
  }
});
