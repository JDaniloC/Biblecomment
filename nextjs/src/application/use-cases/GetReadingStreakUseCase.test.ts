import { describe, it, expect, vi } from "vitest";
import { GetReadingStreakUseCase } from "./GetReadingStreakUseCase";
import type { IUserChapterReadRepository } from "@/domain/repositories/IUserChapterReadRepository";

const NOW = new Date("2026-05-21T15:00:00Z"); // 12:00 BRT

function repoWith(timestamps: Date[]): IUserChapterReadRepository {
	return {
		markRead: vi.fn(),
		unmarkRead: vi.fn(),
		countByUser: vi.fn(),
		findChaptersForBook: vi.fn(),
		countByUserPerBook: vi.fn(),
		findAllForUser: vi.fn(),
		findReadTimestamps: vi.fn().mockResolvedValue(timestamps),
	} as unknown as IUserChapterReadRepository;
}

describe("GetReadingStreakUseCase", () => {
	it("returns a zero streak for a user who never read", async () => {
		const useCase = new GetReadingStreakUseCase(repoWith([]));
		const result = await useCase.execute("u1", NOW);
		expect(result).toEqual({ current: 0, readToday: false, atRisk: false });
	});

	it("computes a multi-day streak ending today (BRT)", async () => {
		const reads = [
			new Date("2026-05-21T15:00:00Z"),
			new Date("2026-05-20T15:00:00Z"),
			new Date("2026-05-19T15:00:00Z"),
		];
		const useCase = new GetReadingStreakUseCase(repoWith(reads));
		const result = await useCase.execute("u1", NOW);
		expect(result).toEqual({ current: 3, readToday: true, atRisk: false });
	});

	it("flags the streak at risk when today's reading is still pending", async () => {
		const reads = [new Date("2026-05-20T15:00:00Z")];
		const useCase = new GetReadingStreakUseCase(repoWith(reads));
		const result = await useCase.execute("u1", NOW);
		expect(result).toEqual({ current: 1, readToday: false, atRisk: true });
	});
});
