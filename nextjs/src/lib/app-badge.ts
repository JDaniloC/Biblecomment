/**
 * Sync the launcher app icon badge with the unread-notification count.
 *
 * Uses the [Badging API](https://w3c.github.io/badging/) — supported by
 * Chrome on Android (for installed PWAs/TWAs) and Chrome/Edge on desktop.
 * Silently no-ops on Safari/Firefox where the API doesn't exist.
 *
 * `count === 0` clears the badge entirely; positive integers show the
 * number. Negative or non-finite values are coerced to a clear so a bug
 * elsewhere can't paint an arbitrary string on the user's launcher.
 */
type NavigatorWithBadge = Navigator & {
	setAppBadge?: (count?: number) => Promise<void>;
	clearAppBadge?: () => Promise<void>;
};

export function syncAppBadge(count: number): void {
	if (typeof navigator === "undefined") return;
	const nav = navigator as NavigatorWithBadge;
	if (!("setAppBadge" in nav)) return;

	if (!Number.isFinite(count) || count <= 0) {
		nav.clearAppBadge?.().catch(() => {});
		return;
	}
	nav.setAppBadge?.(Math.floor(count)).catch(() => {});
}
