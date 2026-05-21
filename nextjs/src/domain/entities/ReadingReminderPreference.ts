/**
 * Per-user opt-in for a daily reading-reminder Web Push. The scheduler
 * runs every 30 minutes, picks rows where the current time in the user's
 * timezone falls in the next 30-minute slot AND `lastSentAt` is before
 * the start of "today" in that timezone, and dispatches a push.
 *
 * `hourLocal` is a half-hour grid (0, 0.5, 1, 1.5, …, 23.5) so users can
 * pick e.g. 07:30 without exploding the time-of-day picker. Stored as a
 * number to keep cron-side arithmetic trivial.
 */
export interface ReadingReminderPreference {
	_id?: string;
	/** Matches `User.username` — same key the push fan-out uses. */
	username: string;
	enabled: boolean;
	/** Half-hour grid: 0, 0.5, 1, 1.5, …, 23.5. */
	hourLocal: number;
	/** IANA tz; defaults to "America/Sao_Paulo" at create time. */
	tz: string;
	/** Last successful push, used to enforce one-per-day. */
	lastSentAt?: Date;
	createdAt?: Date;
	updatedAt?: Date;
}

export const DEFAULT_REMINDER_TZ = "America/Sao_Paulo";
export const DEFAULT_REMINDER_HOUR = 8; // 08:00 local
