import { localDateString } from "./reminder-scheduler";

/**
 * Reading streak — consecutive calendar days (in the reader's timezone)
 * on which they marked at least one chapter as read. "Lenient" by
 * design: any chapter counts, not only the RPSP chapter of the day, so
 * the streak rewards the reading habit itself.
 */
export interface ReadingStreak {
	/** Consecutive days, inclusive of today when `readToday` is true. */
	current: number;
	/** Whether a chapter was already read today. */
	readToday: boolean;
	/**
	 * The streak is alive but today's reading is still pending — the user
	 * read yesterday and has until midnight to keep the run going.
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

/**
 * Compute the streak from raw `readAt` timestamps. The streak counts
 * back from today (if read today) or yesterday (if not yet read today
 * but read yesterday). A gap of 2+ days resets it to zero.
 */
export function computeStreak(
	readDates: Date[],
	now: Date,
	tz: string,
): ReadingStreak {
	if (readDates.length === 0) {
		return { current: 0, readToday: false, atRisk: false };
	}

	const days = new Set(readDates.map((d) => localDateString(d, tz)));
	const today = localDateString(now, tz);
	const yesterday = localDateString(
		new Date(now.getTime() - 86_400_000),
		tz,
	);

	let anchor: string;
	let readToday: boolean;
	if (days.has(today)) {
		anchor = today;
		readToday = true;
	} else if (days.has(yesterday)) {
		anchor = yesterday;
		readToday = false;
	} else {
		// Last read (if any) was 2+ days ago — streak broken.
		return { current: 0, readToday: false, atRisk: false };
	}

	let current = 0;
	let cursor = anchor;
	while (days.has(cursor)) {
		current++;
		cursor = previousDay(cursor);
	}

	return { current, readToday, atRisk: !readToday };
}
