/**
 * ShopFinder — Service Worker (T085).
 *
 * PWA offline-first de páginas públicas. Versionado: bump de CACHE_VERSION
 * + skipWaiting/clients.claim limpa caches antigos no activate (kill-switch:
 * para desativar por completo, remover o <ServiceWorkerRegister /> do root
 * layout — ver MANUAL_DO_OPERADOR.md §PWA).
 *
 * Estratégias:
 *  - static (/_next/static, /icon*, /manifest.webmanifest, favicon*): cache-first.
 *  - navegações GET públicas ("/", /produtos/*, institucionais, /waitlist):
 *    network-first com fallback para o cache (revisita offline funciona).
 *  - NUNCA intercepta: /api/*, /conta*, /admin*, não-GET, cross-origin,
 *    nem respostas com Set-Cookie (nada privado/stale autenticado).
 *  - LRU simples: no máx. MAX_PAGES páginas no cache de navegação.
 */
const CACHE_VERSION = "v1";
const STATIC_CACHE = `sf-static-${CACHE_VERSION}`;
const PAGES_CACHE = `sf-pages-${CACHE_VERSION}`;
const MAX_PAGES = 50;

const PRECACHE_URLS = [
  "/",
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-maskable-192.png",
  "/icon-maskable-512.png"
];

// Rotas que o SW JAMAIS toca (privadas/dinâmicas).
const NEVER_PREFIXES = ["/api/", "/conta", "/admin", "/login", "/register"];

function isPublicNavigation(url) {
  if (url.pathname === "/" || url.pathname === "/termos" || url.pathname === "/privacidade" ||
      url.pathname === "/cookies" || url.pathname === "/waitlist" || url.pathname === "/sobre" ||
      url.pathname === "/contato") {
    return true;
  }
  return url.pathname.startsWith("/produtos/");
}

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icon") ||
    url.pathname.startsWith("/favicon") ||
    url.pathname === "/manifest.webmanifest" ||
    url.pathname === "/logo.svg"
  );
}

function cacheable(response) {
  return (
    response &&
    response.ok &&
    response.type === "basic" &&
    !response.headers.has("set-cookie")
  );
}

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= maxEntries) return;
  // LRU simples: o cache é FIFO por inserção — remove os mais antigos.
  for (const key of keys.slice(0, keys.length - maxEntries)) {
    await cache.delete(key);
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (cacheable(response)) {
    await cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (cacheable(response)) {
      await cache.put(request, response.clone());
      await trimCache(cacheName, MAX_PAGES);
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    // Último recurso offline: home pré-cacheada; sem nada, deixa falhar.
    const home = await caches.match("/");
    if (home) return home;
    throw error;
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name.startsWith("sf-") && !name.endsWith(`-${CACHE_VERSION}`))
          .map((name) => caches.delete(name))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (NEVER_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) return;

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  if (request.mode === "navigate" && isPublicNavigation(url)) {
    event.respondWith(networkFirst(request, PAGES_CACHE));
    return;
  }
  // Demais requests (RSC payloads, prefetches, rotas não listadas): pass-through.
});
