/**
 * Short, non-disruptive haptic feedback for tactile-worthy UI actions
 * (mark-as-read, like, plan-day complete). Uses the [Vibration
 * API](https://developer.mozilla.org/en-US/docs/Web/API/Vibration_API),
 * which is honored on Android/Chrome inside a TWA and silently ignored
 * on iOS Safari and on desktop browsers.
 *
 * Users can globally disable this via `localStorage.bc:haptic = "0"`
 * (UI toggle lives in /profile → settings). When the key is unset, the
 * default is ON — the API itself is the gate on platforms that don't
 * support it.
 */
const PRESETS: Record<"tap" | "confirm" | "error", number | number[]> = {
	tap: 10,
	confirm: 15,
	error: [30, 60, 30],
};

const DISABLED_KEY = "bc:haptic";

type Preset = keyof typeof PRESETS;

function userOptedOut(): boolean {
	if (typeof window === "undefined") return false;
	try {
		return window.localStorage?.getItem(DISABLED_KEY) === "0";
	} catch {
		return false;
	}
}

export function haptic(preset: Preset = "tap"): void {
	if (typeof navigator === "undefined") return;
	if (typeof navigator.vibrate !== "function") return;
	if (userOptedOut()) return;
	try {
		navigator.vibrate(PRESETS[preset]);
	} catch {
		// Some browsers throw if vibrate is called outside a user gesture;
		// we never want a haptic call to break the action that follows it.
	}
}

/** Exposed for the settings UI so it can read/write the same key. */
export function isHapticEnabled(): boolean {
	return !userOptedOut();
}

export function setHapticEnabled(enabled: boolean): void {
	if (typeof window === "undefined") return;
	try {
		if (enabled) {
			window.localStorage?.removeItem(DISABLED_KEY);
		} else {
			window.localStorage?.setItem(DISABLED_KEY, "0");
		}
	} catch {
		// localStorage can throw in private browsing modes; degrade silently.
	}
}
