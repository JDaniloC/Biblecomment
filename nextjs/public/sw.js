// Bible Comment service worker — PWA shell + offline chapter reading +
// web push.
//
// Offline chapter reading caches the SESSION-FREE `?offline=1` snapshot
// of a chapter (rendered with no user, no badges, no "marcar como
// lido"), never the personalized page. So a cached entry can't leak one
// user's view to the next on a shared device — the leak that made v2/v3
// avoid /verses/ caching entirely.
//
// Bump CACHE_VERSION to force clients to drop old caches on activate.
const CACHE_VERSION = "biblecomment-v4";
const RUNTIME_CACHE = "biblecomment-runtime-v4";
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

// Resolve the generic offline page (or a bare 503 if it isn't cached).
function offlineFallback() {
	return caches.match("/offline").then(
		(offline) =>
			offline ||
			new Response("Offline", {
				status: 503,
				headers: { "Content-Type": "text/plain; charset=utf-8" },
			}),
	);
}

// Snapshot the session-free `?offline=1` variant of a chapter so it can
// be read offline. Cached once and left alone — verse text is immutable
// and slightly-stale offline comments are an acceptable trade for not
// re-rendering the page on every visit (which would also load the DB).
async function cacheChapterSnapshot(pathname) {
	const snapshotUrl = pathname + "?offline=1";
	const cache = await caches.open(RUNTIME_CACHE);
	const existing = await cache.match(snapshotUrl);
	if (existing) return;
	try {
		const res = await fetch(snapshotUrl);
		if (res.ok) await cache.put(snapshotUrl, res);
	} catch {
		// Offline or server error — nothing to snapshot; try again next visit.
	}
}

self.addEventListener("fetch", (event) => {
	const { request } = event;

	if (request.method !== "GET") return;

	const url = new URL(request.url);

	// Same-origin only; never intercept third-party (Google Fonts, Sentry, etc).
	if (url.origin !== self.location.origin) return;

	// APIs and auth endpoints: always hit the network. Stale comments or
	// session data would be worse than a network error.
	if (url.pathname.startsWith("/api/")) return;

	// Navigation requests: network-first. Chapter pages additionally get
	// offline support via their session-free `?offline=1` snapshot (see
	// the header comment). Everything else falls back to /offline.
	if (request.mode === "navigate") {
		const isChapter = /^\/verses\/[^/]+\/[^/]+\/?$/.test(url.pathname);
		event.respondWith(
			fetch(request)
				.then((response) => {
					// Online: serve the live (personalized) page, and lazily
					// snapshot the anonymous variant for future offline use.
					if (isChapter) {
						event.waitUntil(cacheChapterSnapshot(url.pathname));
					}
					return response;
				})
				.catch(() => {
					if (isChapter) {
						// Offline: serve the cached anonymous snapshot if we have
						// one; otherwise the generic offline page.
						return caches
							.open(RUNTIME_CACHE)
							.then((cache) => cache.match(url.pathname + "?offline=1"))
							.then((snap) => snap || offlineFallback());
					}
					return offlineFallback();
				}),
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
