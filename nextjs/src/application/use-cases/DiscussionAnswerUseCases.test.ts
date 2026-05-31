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
		findByUsername: () => Promise.resolve(user),
		findByEmail: () => Promise.resolve(user),
		findById: () => Promise.resolve(null),
		findByUsernamePublic: () => Promise.resolve(null),
		searchByUsernamePrefix: () => Promise.resolve([]),
		findByUsernames: () => Promise.resolve([]),
		findManyByIds: () => Promise.resolve([]),
		findAll: () => Promise.resolve([]),
		findAllPaginated: () => Promise.resolve([]),
		findForModeration: () => Promise.resolve({ items: [], nextCursor: null }),
		create: () => Promise.reject(new Error("not implemented")),
		updatePassword: () => Promise.resolve(),
		updatePasswordById: () => Promise.resolve(),
		update: () => Promise.resolve(null),
		markTutorialCompleted: () => Promise.resolve(),
		addBadges: () => Promise.resolve([]),
		setDisabled: () => Promise.resolve(null),
		setEmailVerified: () => Promise.resolve(),
		setPendingEmail: () => Promise.resolve(),
		clearPendingEmail: () => Promise.resolve(),
		promotePendingEmail: () => Promise.resolve(),
		findByEmailOrPendingEmail: () => Promise.resolve(null),
		delete: () => Promise.resolve(),
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
		findById: (id: string) => Promise.resolve(byId.get(id) ?? null),
		findManyByIds: (ids: string[]) =>
			Promise.resolve(
				ids.map((i) => byId.get(i)).filter((d): d is Discussion => Boolean(d)),
			),
		findAllPaginated: () => Promise.resolve(discussions),
		findByBookAbbrev: () => Promise.resolve(discussions),
		findByBookAbbrevPaginated: () => Promise.resolve(discussions),
		findAll: () => Promise.resolve(discussions),
		create: (d) => Promise.resolve({ _id: "new", ...d } as Discussion),
		createMany: () => Promise.resolve(discussions.length),
		update: (id, patch) => {
			const d = byId.get(id);
			if (!d) return Promise.resolve(null);
			const updated = { ...d, ...patch } as Discussion;
			byId.set(id, updated);
			return Promise.resolve(updated);
		},
		delete: () => Promise.resolve(),
		anonymizeByUsername: () => Promise.resolve(0),
		userHasOpenedDiscussion: () => Promise.resolve(discussions.length > 0),
		countByCommentId: () => Promise.resolve(new Map<string, number>()),
	};
}

function inMemoryAnswerRepo(): IDiscussionAnswerRepository {
	let nextId = 1;
	const rows: DiscussionAnswer[] = [];
	return {
		add({ discussionId, userId, username, text }) {
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
			return Promise.resolve(row);
		},
		update(answerId, text) {
			const row = rows.find((r) => r._id === answerId);
			if (!row) return Promise.resolve(null);
			row.text = text;
			row.updatedAt = new Date();
			return Promise.resolve(row);
		},
		findById(answerId) {
			return Promise.resolve(rows.find((r) => r._id === answerId) ?? null);
		},
		findByDiscussion(discussionId) {
			return Promise.resolve(
				rows
					.filter((r) => r.discussionId === discussionId)
					.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()),
			);
		},
		countByDiscussion(ids) {
			const out = new Map<string, number>();
			for (const id of ids) {
				const n = rows.filter((r) => r.discussionId === id).length;
				if (n > 0) out.set(id, n);
			}
			return Promise.resolve(out);
		},
		findByUser(userId) {
			return Promise.resolve(rows.filter((r) => r.userId === userId));
		},
		userHasAnsweredAny(userId) {
			return Promise.resolve(rows.some((r) => r.userId === userId));
		},
		latestPerDiscussion() {
			return Promise.resolve([]);
		},
		anonymizeByUser(userId, replacement) {
			let n = 0;
			for (const r of rows)
				if (r.userId === userId) {
					r.username = replacement;
					n++;
				}
			return Promise.resolve(n);
		},
		deleteByDiscussion(discussionId) {
			const before = rows.length;
			for (let i = rows.length - 1; i >= 0; i--) {
				if (rows[i].discussionId === discussionId) rows.splice(i, 1);
			}
			return Promise.resolve(before - rows.length);
		},
	};
}

function inMemoryDiscussionLikeRepo(): IDiscussionLikeRepository {
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
		expect(a1._id).toBeDefined();
		const a1Id = a1._id ?? "";
		await likes.like("viewer", "discussion", "d1");
		await likes.like("other", "discussion", "d1");
		await likes.like("viewer", "answer", a1Id);

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
