import { describe, it, expect, vi } from "vitest";
import {
	GetReadingStreakUseCase,
	type StreakRepos,
} from "./GetReadingStreakUseCase";

const NOW = new Date("2026-05-21T15:00:00Z"); // 12:00 BRT
const INPUT = { userId: "u1", username: "alice" };

/** BRT-noon timestamp for a given day. */
function brtNoon(ymd: string): Date {
	return new Date(`${ymd}T15:00:00Z`);
}

function makeRepos(opts: {
	chapterReads?: Date[];
	commentDates?: Date[];
	sessionDays?: string[];
}): StreakRepos {
	return {
		chapterRead: {
			findReadTimestamps: vi.fn().mockResolvedValue(opts.chapterReads ?? []),
		} as unknown as StreakRepos["chapterRead"],
		comment: {
			findCommentTimestampsByUsername: vi
				.fn()
				.mockResolvedValue(opts.commentDates ?? []),
		} as unknown as StreakRepos["comment"],
		readingSession: {
			findDays: vi.fn().mockResolvedValue(opts.sessionDays ?? []),
		} as unknown as StreakRepos["readingSession"],
	};
}

describe("GetReadingStreakUseCase", () => {
	it("returns a zero streak when no signal fired", async () => {
		const useCase = new GetReadingStreakUseCase(makeRepos({}));
		const result = await useCase.execute(INPUT, NOW);
		expect(result).toEqual({ current: 0, readToday: false, atRisk: false });
	});

	it("counts a chapter-read day", async () => {
		const useCase = new GetReadingStreakUseCase(
			makeRepos({ chapterReads: [brtNoon("2026-05-21")] }),
		);
		const result = await useCase.execute(INPUT, NOW);
		expect(result).toEqual({ current: 1, readToday: true, atRisk: false });
	});

	it("counts a comment-only day (no chapter marked, no session)", async () => {
		const useCase = new GetReadingStreakUseCase(
			makeRepos({ commentDates: [brtNoon("2026-05-21")] }),
		);
		const result = await useCase.execute(INPUT, NOW);
		expect(result.current).toBe(1);
		expect(result.readToday).toBe(true);
	});

	it("counts a reading-session-only day", async () => {
		const useCase = new GetReadingStreakUseCase(
			makeRepos({ sessionDays: ["2026-05-21"] }),
		);
		const result = await useCase.execute(INPUT, NOW);
		expect(result.current).toBe(1);
		expect(result.readToday).toBe(true);
	});

	it("unions the three signals into one consecutive run", async () => {
		// 19th: session · 20th: comment · 21st: chapter read → 3-day streak.
		const useCase = new GetReadingStreakUseCase(
			makeRepos({
				sessionDays: ["2026-05-19"],
				commentDates: [brtNoon("2026-05-20")],
				chapterReads: [brtNoon("2026-05-21")],
			}),
		);
		const result = await useCase.execute(INPUT, NOW);
		expect(result).toEqual({ current: 3, readToday: true, atRisk: false });
	});

	it("deduplicates a day covered by multiple signals", async () => {
		// Same day from all three sources still counts once.
		const useCase = new GetReadingStreakUseCase(
			makeRepos({
				sessionDays: ["2026-05-21"],
				commentDates: [brtNoon("2026-05-21")],
				chapterReads: [brtNoon("2026-05-21")],
			}),
		);
		const result = await useCase.execute(INPUT, NOW);
		expect(result.current).toBe(1);
	});

	it("flags atRisk when yesterday counted but today is still empty", async () => {
		const useCase = new GetReadingStreakUseCase(
			makeRepos({ sessionDays: ["2026-05-20"] }),
		);
		const result = await useCase.execute(INPUT, NOW);
		expect(result).toEqual({ current: 1, readToday: false, atRisk: true });
	});
});
