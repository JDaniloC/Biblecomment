// Bible Comment service worker — minimal PWA shell.
// Bump CACHE_VERSION to force clients to drop the old cache on activate.
const CACHE_VERSION = "biblecomment-v1";
const SHELL_ASSETS = [
  "/",
  "/offline",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) =>
        // addAll is atomic; if any asset 404s the install fails. Use
        // individual adds and ignore failures so a stale icon path
        // doesn't block PWA install entirely.
        Promise.all(
          SHELL_ASSETS.map((url) =>
            cache.add(url).catch(() => undefined),
          ),
        ),
      )
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_VERSION)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Same-origin only; never intercept third-party (Google Fonts, Sentry, etc).
  if (url.origin !== self.location.origin) return;

  // APIs and auth endpoints: always hit the network. Stale comments or
  // session data would be worse than a network error.
  if (url.pathname.startsWith("/api/")) return;

  // Navigation requests: network-first, fall back to /offline shell.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match("/offline").then(
          (cached) =>
            cached ||
            new Response("Offline", {
              status: 503,
              headers: { "Content-Type": "text/plain; charset=utf-8" },
            }),
        ),
      ),
    );
    return;
  }

  // Hashed Next.js assets and icons: cache-first (immutable by URL).
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.webmanifest" ||
    url.pathname === "/apple-touch-icon.png"
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_VERSION).then((cache) => cache.put(request, clone));
            }
            return response;
          }),
      ),
    );
  }
  // Everything else: default browser handling (no SW intervention).
});
