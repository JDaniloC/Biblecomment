/**
 * Pure helpers for matching a user's `hourLocal` preference against the
 * current wall-clock time in their timezone, and deciding whether the
 * cron job should send today's reminder.
 *
 * Kept separate from the use case so they're testable without Mongo —
 * the use case wires them up to repositories and the push sender.
 */

/**
 * Returns the half-hour grid value (0, 0.5, 1, 1.5, …, 23.5) that the
 * given `now` falls into, evaluated in `tz`. Minute < 30 → the on-the-hour
 * slot; minute >= 30 → the half-past slot.
 */
export function currentHalfHourSlotInTz(now: Date, tz: string): number {
	const parts = new Intl.DateTimeFormat("en-US", {
		timeZone: tz,
		hour12: false,
		hour: "2-digit",
		minute: "2-digit",
	}).formatToParts(now);
	const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
	const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
	return (h % 24) + (m >= 30 ? 0.5 : 0);
}

/**
 * YYYY-MM-DD calendar date of `d` in `tz`. Used to decide whether the
 * last reminder was "earlier today" (skip) or "before today" (send).
 */
export function localDateString(d: Date, tz: string): string {
	return new Intl.DateTimeFormat("en-CA", {
		timeZone: tz,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).format(d);
}

/**
 * True when the user's configured `hourLocal` matches the current half-
 * hour slot OR the previous one. The fallback catches cron jitter (e.g.,
 * Netlify fires at 08:31 instead of 08:30), at the cost of opening a
 * one-hour window — `lastSentAt` per-day-in-tz gating prevents the
 * obvious "send twice in one day" failure mode that fallback enables.
 */
export function matchesCurrentSlot(
	now: Date,
	tz: string,
	hourLocal: number,
): boolean {
	const slot = currentHalfHourSlotInTz(now, tz);
	const prev = (slot - 0.5 + 24) % 24;
	return hourLocal === slot || hourLocal === prev;
}

/**
 * Final yes/no: should the cron send a reminder right now for the
 * preference, given the time and the user's last-sent timestamp?
 */
export function shouldSendNow(opts: {
	now: Date;
	tz: string;
	hourLocal: number;
	lastSentAt?: Date | null;
}): boolean {
	if (!matchesCurrentSlot(opts.now, opts.tz, opts.hourLocal)) return false;
	if (!opts.lastSentAt) return true;
	return localDateString(opts.lastSentAt, opts.tz) !== localDateString(opts.now, opts.tz);
}
