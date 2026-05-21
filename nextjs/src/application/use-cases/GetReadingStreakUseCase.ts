import type { IUserChapterReadRepository } from "@/domain/repositories/IUserChapterReadRepository";
import { computeStreak, type ReadingStreak } from "@/lib/reading-streak";
import { DEFAULT_REMINDER_TZ } from "@/domain/entities/ReadingReminderPreference";

/**
 * Resolves a user's reading streak. The streak is evaluated in Brazil
 * time (the audience's timezone) so the "today" boundary matches the
 * RPSP daily-reading boundary the rest of the app uses.
 */
export class GetReadingStreakUseCase {
	constructor(private readonly reads: IUserChapterReadRepository) {}

	async execute(userId: string, now: Date = new Date()): Promise<ReadingStreak> {
		const timestamps = await this.reads.findReadTimestamps(userId);
		return computeStreak(timestamps, now, DEFAULT_REMINDER_TZ);
	}
}
