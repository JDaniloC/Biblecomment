/**
 * Pure helpers for the client-side reading-time tracker. The tracker
 * accumulates active seconds spent on chapter pages in localStorage,
 * keyed by the Brazil-time calendar day, so time carries across
 * chapter-to-chapter navigation within the same day. Once the threshold
 * is reached it posts a reading session once.
 */

/** Active reading time (seconds) that counts as a genuine session. */
export const READING_SESSION_THRESHOLD_SECONDS = 600; // 10 minutes

const SECONDS_PREFIX = "bc:reading-seconds:";
const POSTED_PREFIX = "bc:reading-posted:";

/** Brazil is UTC-3 year-round — no DST since 2019. */
const BRAZIL_OFFSET_MS = 3 * 60 * 60 * 1000;

/** BRT calendar day ("YYYY-MM-DD") for a timestamp. */
export function brtDayKey(now: Date = new Date()): string {
	const shifted = new Date(now.getTime() - BRAZIL_OFFSET_MS);
	const y = shifted.getUTCFullYear();
	const m = String(shifted.getUTCMonth() + 1).padStart(2, "0");
	const d = String(shifted.getUTCDate()).padStart(2, "0");
	return `${y}-${m}-${d}`;
}

function readNumber(key: string): number {
	try {
		const raw = window.localStorage.getItem(key);
		const n = raw ? Number(raw) : 0;
		return Number.isFinite(n) && n >= 0 ? n : 0;
	} catch {
		return 0;
	}
}

/** Accumulated active seconds for `day` (defaults to today, BRT). */
export function getAccumulatedSeconds(day: string = brtDayKey()): number {
	if (typeof window === "undefined") return 0;
	return readNumber(SECONDS_PREFIX + day);
}

/**
 * Add `delta` seconds to today's tally and return the new total. Prunes
 * any stale keys from previous days so localStorage doesn't grow.
 */
export function addReadingSeconds(
	delta: number,
	day: string = brtDayKey(),
): number {
	if (typeof window === "undefined" || delta <= 0) {
		return getAccumulatedSeconds(day);
	}
	try {
		// Prune yesterday-and-older entries — only "today" is ever relevant.
		for (let i = window.localStorage.length - 1; i >= 0; i--) {
			const k = window.localStorage.key(i);
			if (!k) continue;
			if (
				(k.startsWith(SECONDS_PREFIX) || k.startsWith(POSTED_PREFIX)) &&
				!k.endsWith(day)
			) {
				window.localStorage.removeItem(k);
			}
		}
		const next = readNumber(SECONDS_PREFIX + day) + delta;
		window.localStorage.setItem(SECONDS_PREFIX + day, String(next));
		return next;
	} catch {
		return getAccumulatedSeconds(day);
	}
}

/** Whether a reading session was already posted for `day`. */
export function hasPostedSession(day: string = brtDayKey()): boolean {
	if (typeof window === "undefined") return false;
	try {
		return window.localStorage.getItem(POSTED_PREFIX + day) === "1";
	} catch {
		return false;
	}
}

/** Mark `day` as posted so the tracker doesn't POST twice. */
export function markSessionPosted(day: string = brtDayKey()): void {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.setItem(POSTED_PREFIX + day, "1");
	} catch {
		// private mode — degrade silently; worst case is a duplicate POST,
		// which the endpoint upsert makes harmless anyway.
	}
}
