// Bible Comment service worker — PWA shell + offline fallback + web push.
// (We do NOT cache /verses/ HTML for offline reading anymore — those
// pages are session-personalized and a shared cache entry could leak
// between users on the same device. See navigation branch below.)
// Bump CACHE_VERSION to force clients to drop old caches on activate.
// Bumped to v3 to evict the biblecomment-runtime-v2 cache: v2 cached
// /verses/ HTML which was server-rendered with session-derived props
// and could leak across users on a shared device (Copilot review on
// PR #205). Existing clients running v2 will drop that cache on
// activate as soon as they pick up this SW.
const CACHE_VERSION = "biblecomment-v3";
const RUNTIME_CACHE = "biblecomment-runtime-v3";
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
					SHELL_ASSETS.map((url) => cache.add(url).catch(() => undefined)),
				),
			)
			.then(() => self.skipWaiting()),
	);
});

self.addEventListener("activate", (event) => {
	const keep = [CACHE_VERSION, RUNTIME_CACHE];
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(
					keys
						.filter((key) => !keep.includes(key))
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

	// Navigation requests: network-first → /offline fallback. We deliberately
	// do NOT cache /verses/ HTML even though it would enable offline reading
	// of visited chapters: those pages are server-rendered with session-
	// derived props (user-specific verse badges, "marcar como lido", etc.),
	// and a single cached entry would leak one user's personalized view to
	// the next user on a shared device. A future revision could opt into
	// offline chapter reading by serving an anonymous variant + a
	// cookie-aware cache key — out of scope here.
	if (request.mode === "navigate") {
		event.respondWith(
			fetch(request).catch(() =>
				caches.match("/offline").then(
					(offline) =>
						offline ||
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
							caches
								.open(CACHE_VERSION)
								.then((cache) => cache.put(request, clone));
						}
						return response;
					}),
			),
		);
	}
	// Everything else: default browser handling (no SW intervention).
});

// ── Web Push ────────────────────────────────────────────────────────
// Payload is JSON: { title, body, url, tag } (see PushNotificationService).
self.addEventListener("push", (event) => {
	let data = {};
	try {
		data = event.data ? event.data.json() : {};
	} catch {
		data = {};
	}
	const title = data.title || "Bible Comment";
	event.waitUntil(
		self.registration.showNotification(title, {
			body: data.body || "",
			icon: "/icons/icon-192.png",
			badge: "/icons/icon-192.png",
			tag: data.tag || undefined,
			lang: "pt-BR",
			data: { url: data.url || "/" },
		}),
	);
});

self.addEventListener("notificationclick", (event) => {
	event.notification.close();
	const target = event.notification.data?.url || "/";
	event.waitUntil(
		self.clients
			.matchAll({ type: "window", includeUncontrolled: true })
			.then((clientList) => {
				for (const client of clientList) {
					if (
						client.url &&
						new URL(client.url).origin === self.location.origin
					) {
						if ("navigate" in client)
							client.navigate(target).catch(() => undefined);
						return client.focus();
					}
				}
				return self.clients.openWindow(target);
			}),
	);
});
