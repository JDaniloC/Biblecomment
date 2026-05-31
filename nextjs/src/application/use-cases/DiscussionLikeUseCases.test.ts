import { describe, it, expect } from "vitest";
import { ToggleDiscussionLikeUseCase } from "./DiscussionLikeUseCases";
import type {
	IDiscussionLikeRepository,
	DiscussionLikeTarget,
} from "@/domain/repositories/IDiscussionLikeRepository";

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
	};
}

describe("ToggleDiscussionLikeUseCase", () => {
	it("first toggle likes a discussion → count 1, likedByMe true", async () => {
		const uc = new ToggleDiscussionLikeUseCase(inMemoryDiscussionLikeRepo());
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
		const uc = new ToggleDiscussionLikeUseCase(repo);
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
		const uc = new ToggleDiscussionLikeUseCase(repo);
		await uc.execute("discussion", "x", "u1");
		await uc.execute("discussion", "x", "u2");
		await uc.execute("answer", "x", "u1"); // same id, different target type
		const result = await uc.execute("discussion", "x", "u3");
		expect(result.likeCount).toBe(3);
		expect((await repo.countByTargets("answer", ["x"])).get("x")).toBe(1);
	});
});
