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
		async like(userId, t, id) {
			const k = key(t, id);
			if (!data.has(k)) data.set(k, new Set());
			const s = data.get(k)!;
			if (s.has(userId)) return false;
			s.add(userId);
			return true;
		},
		async unlike(userId, t, id) {
			data.get(key(t, id))?.delete(userId);
		},
		async hasLiked(userId, t, id) {
			return data.get(key(t, id))?.has(userId) ?? false;
		},
		async countByTargets(t, ids) {
			const out = new Map<string, number>();
			for (const id of ids) {
				const n = data.get(key(t, id))?.size ?? 0;
				if (n > 0) out.set(id, n);
			}
			return out;
		},
		async whichLiked(userId, t, ids) {
			const out = new Set<string>();
			for (const id of ids) if (data.get(key(t, id))?.has(userId)) out.add(id);
			return out;
		},
		async deleteAllByUser(userId) {
			let n = 0;
			for (const s of data.values()) if (s.delete(userId)) n++;
			return n;
		},
		async deleteByTarget(t, id) {
			const k = key(t, id);
			const n = data.get(k)?.size ?? 0;
			data.delete(k);
			return n;
		},
	};
}

describe("ToggleDiscussionLikeUseCase", () => {
	it("first toggle likes a discussion → count 1, likedByMe true", async () => {
		const uc = new ToggleDiscussionLikeUseCase(inMemoryDiscussionLikeRepo());
		const r = await uc.execute("discussion", "d1", "u1");
		expect(r).toEqual({
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
		const r = await uc.execute("answer", "a1", "u1");
		expect(r).toEqual({
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
		const r = await uc.execute("discussion", "x", "u3");
		expect(r.likeCount).toBe(3);
		expect((await repo.countByTargets("answer", ["x"])).get("x")).toBe(1);
	});
});
