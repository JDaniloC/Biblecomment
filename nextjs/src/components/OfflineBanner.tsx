"use client";

import { useEffect, useState } from "react";

/**
 * Slim sticky strip shown while the device is offline. On chapter pages
 * the service worker serves a cached session-free snapshot, so the
 * banner doubles as the explanation for why personalized bits (badges,
 * "marcar como lido") and fresh comments aren't there. Renders nothing
 * — and occupies no space — when online.
 */
export function OfflineBanner() {
	const [offline, setOffline] = useState(false);

	useEffect(() => {
		const update = () => setOffline(!navigator.onLine);
		update();
		window.addEventListener("online", update);
		window.addEventListener("offline", update);
		return () => {
			window.removeEventListener("online", update);
			window.removeEventListener("offline", update);
		};
	}, []);

	if (!offline) return null;

	return (
		<div
			role="status"
			data-testid="offline-banner"
			className="sticky top-0 z-[150] bg-amber-500 text-amber-950 text-center text-[13px] font-semibold py-1.5 px-3"
		>
			Você está offline — vendo conteúdo salvo.
		</div>
	);
}
