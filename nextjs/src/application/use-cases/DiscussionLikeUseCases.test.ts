import { describe, it, expect, vi } from "vitest";
import { ToggleDiscussionLikeUseCase } from "./DiscussionLikeUseCases";
import type {
	IDiscussionLikeRepository,
	DiscussionLikeTarget,
} from "@/domain/repositories/IDiscussionLikeRepository";
import type { IDiscussionRepository } from "@/domain/repositories/IDiscussionRepository";

/**
 * Minimal discussion repo stub that only implements the method the toggle
 * use case touches (`incrementLikeCount`); everything else rejects so an
 * accidental call surfaces loudly. The spy lets tests assert the
 * denormalized counter is adjusted only for discussion targets.
 */
function spyDiscussionRepo(): IDiscussionRepository {
	const notImpl = () => Promise.reject(new Error("not implemented"));
	return {
		findByBookAbbrev: notImpl,
		findByBookAbbrevPaginated: notImpl,
		findById: notImpl,
		findManyByIds: notImpl,
		findAllPaginated: notImpl,
		create: notImpl,
		update: notImpl,
		createMany: notImpl,
		delete: notImpl,
		findAll: notImpl,
		anonymizeByUsername: notImpl,
		userHasOpenedDiscussion: notImpl,
		countByCommentId: notImpl,
		findByCommentId: notImpl,
		incrementAnswersCount: vi.fn(() => Promise.resolve()),
		incrementLikeCount: vi.fn(() => Promise.resolve()),
		decrementLikeCountMany: notImpl,
	} as unknown as IDiscussionRepository;
}

export function inMemoryDiscussionLikeRepo(): IDiscussionLikeRepository {
	// key = `${targetType}:${targetId}` → Set<userId>
	const data = new Map<string, Set<string>>();
	const key = (t: DiscussionLikeTarget, id: string) => `${t}:${id}`;
	return {
		like(userId, t, id) {
			const mapKey = key(t, id);
			if (!data.has(mapKey)) data.set(mapKey, new Set());
			const set = data.get(mapKey) ?? new Set<string>();
			if (set.has(userId)) return Promise.resolve(false);
			set.add(userId);
			return Promise.resolve(true);
		},
		unlike(userId, t, id) {
			data.get(key(t, id))?.delete(userId);
			return Promise.resolve();
		},
		hasLiked(userId, t, id) {
			return Promise.resolve(data.get(key(t, id))?.has(userId) ?? false);
		},
		countByTargets(t, ids) {
			const out = new Map<string, number>();
			for (const id of ids) {
				const n = data.get(key(t, id))?.size ?? 0;
				if (n > 0) out.set(id, n);
			}
			return Promise.resolve(out);
		},
		whichLiked(userId, t, ids) {
			const out = new Set<string>();
			for (const id of ids) if (data.get(key(t, id))?.has(userId)) out.add(id);
			return Promise.resolve(out);
		},
		deleteAllByUser(userId) {
			let n = 0;
			for (const set of data.values()) if (set.delete(userId)) n++;
			return Promise.resolve(n);
		},
		deleteByTarget(t, id) {
			const mapKey = key(t, id);
			const n = data.get(mapKey)?.size ?? 0;
			data.delete(mapKey);
			return Promise.resolve(n);
		},
		findLikedDiscussionIds(userId) {
			const out: string[] = [];
			for (const [mapKey, set] of data) {
				if (mapKey.startsWith("discussion:") && set.has(userId)) {
					out.push(mapKey.slice("discussion:".length));
				}
			}
			return Promise.resolve(out);
		},
	};
}

describe("ToggleDiscussionLikeUseCase", () => {
	it("first toggle likes a discussion → count 1, likedByMe true", async () => {
		const uc = new ToggleDiscussionLikeUseCase(
			inMemoryDiscussionLikeRepo(),
			spyDiscussionRepo(),
		);
		const result = await uc.execute("discussion", "d1", "u1");
		expect(result).toEqual({
			targetType: "discussion",
			targetId: "d1",
			likeCount: 1,
			likedByMe: true,
		});
	});

	it("second toggle by the same user unlikes → count 0, likedByMe false", async () => {
		const repo = inMemoryDiscussionLikeRepo();
		const uc = new ToggleDiscussionLikeUseCase(repo, spyDiscussionRepo());
		await uc.execute("answer", "a1", "u1");
		const result = await uc.execute("answer", "a1", "u1");
		expect(result).toEqual({
			targetType: "answer",
			targetId: "a1",
			likeCount: 0,
			likedByMe: false,
		});
	});

	it("counts multiple users and keeps discussion/answer namespaces independent", async () => {
		const repo = inMemoryDiscussionLikeRepo();
		const uc = new ToggleDiscussionLikeUseCase(repo, spyDiscussionRepo());
		await uc.execute("discussion", "x", "u1");
		await uc.execute("discussion", "x", "u2");
		await uc.execute("answer", "x", "u1"); // same id, different target type
		const result = await uc.execute("discussion", "x", "u3");
		expect(result.likeCount).toBe(3);
		expect((await repo.countByTargets("answer", ["x"])).get("x")).toBe(1);
	});

	it("bumps the discussion's stored likeCount +1 on a new like", async () => {
		const likeRepo = inMemoryDiscussionLikeRepo();
		const discussionRepo = spyDiscussionRepo();
		const uc = new ToggleDiscussionLikeUseCase(likeRepo, discussionRepo);

		await uc.execute("discussion", "d1", "u1");

		expect(discussionRepo.incrementLikeCount).toHaveBeenCalledTimes(1);
		expect(discussionRepo.incrementLikeCount).toHaveBeenCalledWith("d1", 1);
	});

	it("drops the discussion's stored likeCount -1 on an unlike", async () => {
		const likeRepo = inMemoryDiscussionLikeRepo();
		const discussionRepo = spyDiscussionRepo();
		const uc = new ToggleDiscussionLikeUseCase(likeRepo, discussionRepo);

		await uc.execute("discussion", "d1", "u1"); // like
		(discussionRepo.incrementLikeCount as ReturnType<typeof vi.fn>).mockClear();
		await uc.execute("discussion", "d1", "u1"); // unlike

		expect(discussionRepo.incrementLikeCount).toHaveBeenCalledTimes(1);
		expect(discussionRepo.incrementLikeCount).toHaveBeenCalledWith("d1", -1);
	});

	it("never touches the stored counter for answer likes/unlikes", async () => {
		const likeRepo = inMemoryDiscussionLikeRepo();
		const discussionRepo = spyDiscussionRepo();
		const uc = new ToggleDiscussionLikeUseCase(likeRepo, discussionRepo);

		await uc.execute("answer", "a1", "u1"); // like
		await uc.execute("answer", "a1", "u1"); // unlike

		expect(discussionRepo.incrementLikeCount).not.toHaveBeenCalled();
	});
});
