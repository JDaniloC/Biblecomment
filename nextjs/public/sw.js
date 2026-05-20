// Bible Comment service worker — PWA shell + offline reading + web push.
// Bump CACHE_VERSION to force clients to drop old caches on activate.
const CACHE_VERSION = "biblecomment-v2";
const RUNTIME_CACHE = "biblecomment-runtime-v2";
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

	// Navigation requests: network-first. Successful chapter pages are
	// cached so a previously-visited chapter is readable offline; on a
	// network failure serve the cached page, else the /offline shell.
	if (request.mode === "navigate") {
		event.respondWith(
			fetch(request)
				.then((response) => {
					if (response.ok && url.pathname.startsWith("/verses/")) {
						const clone = response.clone();
						caches
							.open(RUNTIME_CACHE)
							.then((cache) => cache.put(request, clone))
							.catch(() => undefined);
					}
					return response;
				})
				.catch(() =>
					caches.match(request).then(
						(cached) =>
							cached ||
							caches.match("/offline").then(
								(offline) =>
									offline ||
									new Response("Offline", {
										status: 503,
										headers: { "Content-Type": "text/plain; charset=utf-8" },
									}),
							),
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
	const target =
		(event.notification.data && event.notification.data.url) || "/";
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
