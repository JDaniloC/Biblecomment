import type { ReadingReminderPreference } from "@/domain/entities/ReadingReminderPreference";

export interface IReadingReminderPreferenceRepository {
	findByUsername(username: string): Promise<ReadingReminderPreference | null>;
	/** Upserts the row identified by username. */
	upsert(pref: Omit<ReadingReminderPreference, "_id" | "createdAt" | "updatedAt">): Promise<ReadingReminderPreference>;
	/**
	 * Scheduler query: every opted-in row. The cron filters per-user by tz
	 * + slot + `lastSentAt`. The opted-in set is small, so a full fetch is
	 * fine and stays correct regardless of the user's timezone.
	 */
	findAllEnabled(): Promise<ReadingReminderPreference[]>;
	/** Marks the reminder as sent. Idempotent. */
	markSent(username: string, sentAt: Date): Promise<void>;
}
