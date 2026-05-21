import type { ReadingReminderPreference } from "@/domain/entities/ReadingReminderPreference";

export interface IReadingReminderPreferenceRepository {
	findByUsername(username: string): Promise<ReadingReminderPreference | null>;
	/** Upserts the row identified by username. */
	upsert(pref: Omit<ReadingReminderPreference, "_id" | "createdAt" | "updatedAt">): Promise<ReadingReminderPreference>;
	/**
	 * Scheduler query: every row where `enabled` is true and the requested
	 * `hourLocal` is one of `slots`. The caller filters further by tz +
	 * `lastSentAt` after computing per-user local time.
	 */
	findEnabledForSlots(slots: number[]): Promise<ReadingReminderPreference[]>;
	/** Marks the reminder as sent. Idempotent. */
	markSent(username: string, sentAt: Date): Promise<void>;
}
