/**
 * Minimal Bramble service worker — enables install-to-home-screen and a basic
 * offline fallback for navigations (spec §2: offline read is nice-to-have, not
 * v1, so this stays deliberately small). Bump CACHE to invalidate old shells.
 */
const CACHE = "bramble-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.add("/")));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  // Network-first for page navigations; fall back to the cached shell offline.
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).catch(() => caches.match("/")));
  }
});
