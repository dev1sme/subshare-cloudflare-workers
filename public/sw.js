// Service worker: caches the app shell only. Spec: docs/architecture.md#pwa.
//
// - /api/* and anything that is not a same-origin GET is left alone (no respondWith), so the
//   browser goes to the network. Money state is never served from a cache.
// - Navigations are network-first; offline they get the last index.html, the app then fails
//   /api/auth/me and shows its retry screen.
// - /assets/* (content-hashed) is cache-first. A response that is HTML is never cached: a chunk
//   deleted by a deploy falls through to the SPA fallback, which answers index.html with 200.
//
// Kill switch: if this file ever misbehaves in production, deploy a sw.js whose activate handler
// deletes every cache and calls self.registration.unregister() — never just delete the file.

const CACHE = "shell-v1";
const SHELL_KEY = "/";
const MAX_ASSETS = 80;

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((name) => name !== CACHE).map((name) => caches.delete(name)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstShell(request));
  } else if (url.pathname.startsWith("/assets/")) {
    event.respondWith(cacheFirstAsset(request));
  }
});

const isHtml = (response) => (response.headers.get("content-type") ?? "").includes("text/html");

async function networkFirstShell(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    if (response.ok && isHtml(response)) await cache.put(SHELL_KEY, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(SHELL_KEY);
    if (cached) return cached;
    throw error;
  }
}

async function cacheFirstAsset(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok && !isHtml(response)) {
    await cache.put(request, response.clone());
    await trim(cache);
  }
  return response;
}

// Cache.keys() lists entries in insertion order, so the oldest assets go first.
async function trim(cache) {
  const keys = (await cache.keys()).filter((key) => new URL(key.url).pathname !== SHELL_KEY);
  await Promise.all(keys.slice(0, Math.max(0, keys.length - MAX_ASSETS)).map((key) => cache.delete(key)));
}
