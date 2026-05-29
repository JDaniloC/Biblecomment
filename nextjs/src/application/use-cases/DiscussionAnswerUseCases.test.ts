import { describe, it, expect } from "vitest";
import {
	AddAnswerUseCase,
	GetDiscussionByIdUseCase,
	GetAllDiscussionsPaginatedUseCase,
	DeleteDiscussionUseCase,
} from "./DiscussionUseCases";
import type { IDiscussionRepository } from "@/domain/repositories/IDiscussionRepository";
import type { IDiscussionAnswerRepository } from "@/domain/repositories/IDiscussionAnswerRepository";
import type { IUserRepository } from "@/domain/repositories/IUserRepository";
import type { Discussion } from "@/domain/entities/Discussion";
import type { DiscussionAnswer } from "@/domain/entities/DiscussionAnswer";
import type { User } from "@/domain/entities/User";
import type {
	IDiscussionLikeRepository,
	DiscussionLikeTarget,
} from "@/domain/repositories/IDiscussionLikeRepository";

function fakeUser(partial: Partial<User> = {}): User {
	return {
		_id: "u1",
		email: "alice@example.com",
		username: "alice",
		password: "hashed",
		emailVerifiedAt: new Date(),
		...partial,
	};
}

function makeUserRepo(user: User | null): IUserRepository {
	return {
		findByUsername: async () => user,
		findByEmail: async () => user,
		findById: async () => null,
		findByUsernamePublic: async () => null,
		searchByUsernamePrefix: async () => [],
		findByUsernames: async () => [],
		findManyByIds: async () => [],
		findAll: async () => [],
		findAllPaginated: async () => [],
		findForModeration: async () => ({ items: [], nextCursor: null }),
		create: async () => {
			throw new Error("not implemented");
		},
		updatePassword: async () => {},
		updatePasswordById: async () => {},
		update: async () => null,
		markTutorialCompleted: async () => {},
		addBadges: async () => [],
		setDisabled: async () => null,
		setEmailVerified: async () => {},
		setPendingEmail: async () => {},
		clearPendingEmail: async () => {},
		promotePendingEmail: async () => {},
		findByEmailOrPendingEmail: async () => null,
		delete: async () => {},
	};
}

function fakeDiscussion(
	id: string,
	partial: Partial<Discussion> = {},
): Discussion {
	return {
		_id: id,
		bookAbbrev: "gn",
		username: "alice",
		verseReference: "Gn 1:1",
		verseText: "",
		commentText: "",
		question: "?",
		...partial,
	};
}

function discussionRepoStub(discussions: Discussion[]): IDiscussionRepository {
	const byId = new Map(discussions.map((d) => [d._id ?? "", d]));
	return {
		findById: async (id: string) => byId.get(id) ?? null,
		findManyByIds: async (ids: string[]) =>
			ids.map((i) => byId.get(i)).filter((d): d is Discussion => Boolean(d)),
		findAllPaginated: async () => discussions,
		findByBookAbbrev: async () => discussions,
		findByBookAbbrevPaginated: async () => discussions,
		findAll: async () => discussions,
		create: async (d) => ({ _id: "new", ...d }) as Discussion,
		createMany: async () => discussions.length,
		delete: async () => {},
		anonymizeByUsername: async () => 0,
		userHasOpenedDiscussion: async () => discussions.length > 0,
	};
}

function inMemoryAnswerRepo(): IDiscussionAnswerRepository {
	let nextId = 1;
	const rows: DiscussionAnswer[] = [];
	return {
		async add({ discussionId, userId, username, text }) {
			const row: DiscussionAnswer = {
				_id: `a${nextId++}`,
				discussionId,
				userId,
				username,
				text,
				createdAt: new Date(Date.now() + nextId),
				updatedAt: new Date(Date.now() + nextId),
			};
			rows.push(row);
			return row;
		},
		async update(answerId, text) {
			const row = rows.find((r) => r._id === answerId);
			if (!row) return null;
			row.text = text;
			row.updatedAt = new Date();
			return row;
		},
		async findById(answerId) {
			return rows.find((r) => r._id === answerId) ?? null;
		},
		async findByDiscussion(discussionId) {
			return rows
				.filter((r) => r.discussionId === discussionId)
				.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
		},
		async countByDiscussion(ids) {
			const out = new Map<string, number>();
			for (const id of ids) {
				const n = rows.filter((r) => r.discussionId === id).length;
				if (n > 0) out.set(id, n);
			}
			return out;
		},
		async findByUser(userId) {
			return rows.filter((r) => r.userId === userId);
		},
		async userHasAnsweredAny(userId) {
			return rows.some((r) => r.userId === userId);
		},
		async latestPerDiscussion() {
			return [];
		},
		async anonymizeByUser(userId, replacement) {
			let n = 0;
			for (const r of rows)
				if (r.userId === userId) {
					r.username = replacement;
					n++;
				}
			return n;
		},
		async deleteByDiscussion(discussionId) {
			const before = rows.length;
			for (let i = rows.length - 1; i >= 0; i--) {
				if (rows[i].discussionId === discussionId) rows.splice(i, 1);
			}
			return before - rows.length;
		},
	};
}

function inMemoryDiscussionLikeRepo(): IDiscussionLikeRepository {
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

// CreateDiscussionUseCase has its own dedicated suite in DiscussionUseCases.test.ts
// (authoritative comment snapshot, quote-range validation, title sanitization).

describe("AddAnswerUseCase", () => {
	it("appends an answer and returns the discussion with the full answers list + count", async () => {
		const repo = discussionRepoStub([fakeDiscussion("d1")]);
		const answers = inMemoryAnswerRepo();
		const userRepo = makeUserRepo(fakeUser());
		const uc = new AddAnswerUseCase(repo, answers, userRepo);

		const result = await uc.execute("d1", "u-bob", "bob", "first answer");

		expect(result.answersCount).toBe(1);
		expect(result.answers?.[0]).toMatchObject({
			username: "bob",
			text: "first answer",
		});
	});

	it("rejects when the discussion is missing", async () => {
		const repo = discussionRepoStub([]);
		const userRepo = makeUserRepo(fakeUser());
		const uc = new AddAnswerUseCase(repo, inMemoryAnswerRepo(), userRepo);

		await expect(uc.execute("missing", "u-bob", "bob", "x")).rejects.toThrow(
			"Discussion not found",
		);
	});

	it("rejects when answerer email is not verified and does not write an answer", async () => {
		const repo = discussionRepoStub([fakeDiscussion("d1")]);
		const answers = inMemoryAnswerRepo();
		const userRepo = makeUserRepo(fakeUser({ emailVerifiedAt: undefined }));
		const uc = new AddAnswerUseCase(repo, answers, userRepo);

		await expect(
			uc.execute("d1", "u-bob", "bob", "first answer"),
		).rejects.toThrow(/verifique|email_not_verified/i);

		expect(await answers.findByDiscussion("d1")).toHaveLength(0);
	});
});

describe("GetDiscussionByIdUseCase", () => {
	it("hydrates answers when the answer repo is wired", async () => {
		const repo = discussionRepoStub([fakeDiscussion("d1")]);
		const answers = inMemoryAnswerRepo();
		await answers.add({
			discussionId: "d1",
			userId: "u1",
			username: "x",
			text: "older",
		});
		await answers.add({
			discussionId: "d1",
			userId: "u2",
			username: "y",
			text: "newer",
		});

		const result = await new GetDiscussionByIdUseCase(repo, answers).execute(
			"d1",
		);

		expect(result?.answersCount).toBe(2);
		expect(result?.answers?.map((a) => a.text)).toEqual(["older", "newer"]);
	});

	it("returns the bare discussion when no answer repo is provided", async () => {
		const repo = discussionRepoStub([fakeDiscussion("d1")]);

		const result = await new GetDiscussionByIdUseCase(repo).execute("d1");

		expect(result?._id).toBe("d1");
		expect(result?.answers).toBeUndefined();
	});

	it("returns null when the discussion does not exist", async () => {
		const repo = discussionRepoStub([]);
		const answers = inMemoryAnswerRepo();

		const result = await new GetDiscussionByIdUseCase(repo, answers).execute(
			"missing",
		);

		expect(result).toBeNull();
	});

	it("enriches discussion and answers with like stats for the viewer", async () => {
		const repo = discussionRepoStub([fakeDiscussion("d1")]);
		const answers = inMemoryAnswerRepo();
		const a1 = await answers.add({
			discussionId: "d1",
			userId: "u1",
			username: "x",
			text: "one",
		});
		const likes = inMemoryDiscussionLikeRepo();
		await likes.like("viewer", "discussion", "d1");
		await likes.like("other", "discussion", "d1");
		await likes.like("viewer", "answer", a1._id!);

		const result = await new GetDiscussionByIdUseCase(
			repo,
			answers,
			undefined,
			likes,
		).execute("d1", "viewer");

		expect(result?.likeCount).toBe(2);
		expect(result?.likedByMe).toBe(true);
		expect(result?.answers?.[0].likeCount).toBe(1);
		expect(result?.answers?.[0].likedByMe).toBe(true);
	});

	it("leaves likedByMe false for an anonymous viewer but still counts likes", async () => {
		const repo = discussionRepoStub([fakeDiscussion("d1")]);
		const answers = inMemoryAnswerRepo();
		const likes = inMemoryDiscussionLikeRepo();
		await likes.like("someone", "discussion", "d1");

		const result = await new GetDiscussionByIdUseCase(
			repo,
			answers,
			undefined,
			likes,
		).execute("d1");

		expect(result?.likeCount).toBe(1);
		expect(result?.likedByMe).toBe(false);
	});
});

describe("GetAllDiscussionsPaginatedUseCase", () => {
	it("populates answersCount via batch aggregation", async () => {
		const discussions = [
			fakeDiscussion("d1"),
			fakeDiscussion("d2"),
			fakeDiscussion("d3"),
		];
		const repo = discussionRepoStub(discussions);
		const answers = inMemoryAnswerRepo();
		await answers.add({
			discussionId: "d1",
			userId: "u1",
			username: "x",
			text: "a",
		});
		await answers.add({
			discussionId: "d1",
			userId: "u2",
			username: "y",
			text: "b",
		});
		await answers.add({
			discussionId: "d3",
			userId: "u1",
			username: "x",
			text: "c",
		});

		const result = await new GetAllDiscussionsPaginatedUseCase(
			repo,
			answers,
		).execute(1, 50);

		const counts = Object.fromEntries(
			result.map((d) => [d._id, d.answersCount]),
		);
		expect(counts).toEqual({ d1: 2, d2: 0, d3: 1 });
	});
});

describe("DeleteDiscussionUseCase cascade", () => {
	it("deletes answers when the discussion is hard-deleted", async () => {
		const repo = discussionRepoStub([fakeDiscussion("d1")]);
		const answers = inMemoryAnswerRepo();
		await answers.add({
			discussionId: "d1",
			userId: "u1",
			username: "x",
			text: "a",
		});
		await answers.add({
			discussionId: "d2",
			userId: "u1",
			username: "x",
			text: "kept",
		});

		await new DeleteDiscussionUseCase(repo, answers).execute(
			"d1",
			"alice",
			false,
		);

		expect(await answers.findByDiscussion("d1")).toEqual([]);
		expect(await answers.findByDiscussion("d2")).toHaveLength(1);
	});
});
