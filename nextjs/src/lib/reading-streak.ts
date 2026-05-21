import { localDateString } from "./reminder-scheduler";

/**
 * Reading streak — consecutive calendar days (in the reader's timezone)
 * on which they engaged with the Bible. "Hybrid" by design: a day counts
 * if ANY of three signals fired — a timed reading session, a chapter
 * marked as read, or a comment posted. This rewards the habit itself,
 * not just the binary "I finished the whole chapter" button, and keeps
 * working for readers who have already been through the whole Bible.
 */
export interface ReadingStreak {
	/** Consecutive days, inclusive of today when `readToday` is true. */
	current: number;
	/** Whether the user engaged today. */
	readToday: boolean;
	/**
	 * The streak is alive but today's reading is still pending — the user
	 * engaged yesterday and has until midnight to keep the run going.
	 */
	atRisk: boolean;
}

/** Calendar arithmetic on a YYYY-MM-DD string — one day earlier. */
function previousDay(ymd: string): string {
	const [y, m, d] = ymd.split("-").map((n) => parseInt(n, 10));
	const dt = new Date(Date.UTC(y, m - 1, d));
	dt.setUTCDate(dt.getUTCDate() - 1);
	const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
	const dd = String(dt.getUTCDate()).padStart(2, "0");
	return `${dt.getUTCFullYear()}-${mm}-${dd}`;
}

/** Map raw timestamps to their YYYY-MM-DD day in `tz`. */
export function daysFromTimestamps(dates: Date[], tz: string): string[] {
	return dates.map((d) => localDateString(d, tz));
}

/**
 * Compute the streak from a set of engaged day-strings (already in the
 * reader's tz). The streak counts back from today (if engaged today) or
 * yesterday (if not yet today but yesterday). A 2+ day gap resets it.
 */
export function computeStreak(
	engagedDays: Set<string>,
	now: Date,
	tz: string,
): ReadingStreak {
	if (engagedDays.size === 0) {
		return { current: 0, readToday: false, atRisk: false };
	}

	const today = localDateString(now, tz);
	const yesterday = localDateString(
		new Date(now.getTime() - 86_400_000),
		tz,
	);

	let anchor: string;
	let readToday: boolean;
	if (engagedDays.has(today)) {
		anchor = today;
		readToday = true;
	} else if (engagedDays.has(yesterday)) {
		anchor = yesterday;
		readToday = false;
	} else {
		// Last engagement (if any) was 2+ days ago — streak broken.
		return { current: 0, readToday: false, atRisk: false };
	}

	let current = 0;
	let cursor = anchor;
	while (engagedDays.has(cursor)) {
		current++;
		cursor = previousDay(cursor);
	}

	return { current, readToday, atRisk: !readToday };
}
