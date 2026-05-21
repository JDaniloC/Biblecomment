import type { IUserChapterReadRepository } from "@/domain/repositories/IUserChapterReadRepository";
import type { ICommentRepository } from "@/domain/repositories/ICommentRepository";
import type { IReadingSessionRepository } from "@/domain/repositories/IReadingSessionRepository";
import {
	computeStreak,
	daysFromTimestamps,
	type ReadingStreak,
} from "@/lib/reading-streak";
import { DEFAULT_REMINDER_TZ } from "@/domain/entities/ReadingReminderPreference";

export interface StreakRepos {
	chapterRead: IUserChapterReadRepository;
	comment: ICommentRepository;
	readingSession: IReadingSessionRepository;
}

/**
 * Resolves a user's reading streak from the hybrid signal set: a day
 * counts if the reader did ANY of — registered a timed reading session,
 * marked a chapter as read, or posted a comment. Evaluated in Brazil
 * time so the day boundary matches the RPSP plan.
 */
export class GetReadingStreakUseCase {
	constructor(private readonly repos: StreakRepos) {}

	/** Build the union of engaged BRT days across all three signals. */
	async resolveDays(input: {
		userId: string;
		username: string;
	}): Promise<Set<string>> {
		const [readTimestamps, commentTimestamps, sessionDays] = await Promise.all([
			this.repos.chapterRead.findReadTimestamps(input.userId),
			this.repos.comment.findCommentTimestampsByUsername(input.username),
			this.repos.readingSession.findDays(input.userId),
		]);
		return new Set<string>([
			...daysFromTimestamps(readTimestamps, DEFAULT_REMINDER_TZ),
			...daysFromTimestamps(commentTimestamps, DEFAULT_REMINDER_TZ),
			...sessionDays,
		]);
	}

	async execute(
		input: { userId: string; username: string },
		now: Date = new Date(),
	): Promise<ReadingStreak> {
		const days = await this.resolveDays(input);
		return computeStreak(days, now, DEFAULT_REMINDER_TZ);
	}
}
