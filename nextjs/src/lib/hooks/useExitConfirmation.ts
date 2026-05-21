"use client";

import { useEffect, useRef } from "react";
import { useNotification } from "@/contexts/NotificationContext";

/**
 * In a TWA/installed-PWA on Android the hardware back button at the
 * launch page closes the app immediately, which feels jarring — users
 * who hit back by mistake lose their place. We push a sentinel history
 * entry on mount so the first back becomes a confirmation toast, and a
 * second back within 2s exits as expected.
 *
 * No-op outside `display-mode: standalone` so the same component on a
 * regular browser tab still has normal "back goes to the previous page"
 * behavior.
 */
function isStandalone(): boolean {
	if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
		return false;
	}
	return window.matchMedia("(display-mode: standalone)").matches;
}

export function useExitConfirmation(): void {
	const { handleNotification } = useNotification();
	const expectingExit = useRef(false);

	useEffect(() => {
		if (!isStandalone()) return;

		// Drop a sentinel history entry so the first back triggers popstate
		// (instead of closing the TWA) and we can intercept.
		window.history.pushState(null, "", window.location.href);

		function onPopState() {
			if (expectingExit.current) {
				// Second back within the window — let it through (app closes).
				return;
			}
			handleNotification("info", "Pressione novamente para sair");
			// Re-push the sentinel so we're still capturing the next back.
			window.history.pushState(null, "", window.location.href);
			expectingExit.current = true;
			window.setTimeout(() => {
				expectingExit.current = false;
			}, 2000);
		}

		window.addEventListener("popstate", onPopState);
		return () => window.removeEventListener("popstate", onPopState);
	}, [handleNotification]);
}
