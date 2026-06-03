import { describe, it, expect } from "vitest";
import {
	CreateDiscussionUseCase,
	GetDiscussionsByCommentUseCase,
	UpdateDiscussionUseCase,
} from "./DiscussionUseCases";
import type { IDiscussionRepository } from "@/domain/repositories/IDiscussionRepository";
import type { IDiscussionAnswerRepository } from "@/domain/repositories/IDiscussionAnswerRepository";
import type { ICommentRepository } from "@/domain/repositories/ICommentRepository";
import type { IUserRepository } from "@/domain/repositories/IUserRepository";
import type { IDiscussionLikeRepository } from "@/domain/repositories/IDiscussionLikeRepository";
import type { Discussion } from "@/domain/entities/Discussion";
import type { Comment } from "@/domain/entities/Comment";
import type { User } from "@/domain/entities/User";
import { EmailNotVerifiedError } from "@/lib/auth-guards";

function makeComment(partial: Partial<Comment> = {}): Comment {
	return {
		_id: "c1",
		verseId: "v1",
		username: "alice",
		onTitle: false,
		bookReference: "JO 3:16",
		text: "Porque Deus amou o mundo.",
		tags: [],
		...partial,
	};
}

function commentRepoStub(comments: Comment[]): ICommentRepository {
	const byId = new Map(comments.map((c) => [c._id ?? "", c]));
	return {
		findById: (id: string) => Promise.resolve(byId.get(id) ?? null),
	} as unknown as ICommentRepository;
}

function userRepoStub(verified: boolean): IUserRepository {
	const user = {
		username: "bob",
		email: "b@b.com",
		password: "x",
		emailVerifiedAt: verified ? new Date() : undefined,
	} as unknown as User;
	return {
		findByUsername: () => Promise.resolve(user),
	} as unknown as IUserRepository;
}

function capturingDiscussionRepo(): {
	repo: IDiscussionRepository;
	created: Discussion[];
} {
	const created: Discussion[] = [];
	const repo = {
		create(d: Omit<Discussion, "_id" | "createdAt" | "updatedAt">) {
			const full = {
				...d,
				_id: "d1",
				createdAt: new Date(),
				updatedAt: new Date(),
			} as Discussion;
			created.push(full);
			return Promise.resolve(full);
		},
	} as unknown as IDiscussionRepository;
	return { repo, created };
}

const base = {
	bookAbbrev: "jo",
	username: "bob",
	commentId: "c1",
	title: "Será que isso é literal?",
	body: "Acho que fala de amor sacrificial.\n\nVejam o contexto.",
};

describe("CreateDiscussionUseCase", () => {
	it("stores the authoritative comment text from the linked comment", async () => {
		const { repo, created } = capturingDiscussionRepo();
		const uc = new CreateDiscussionUseCase(
			repo,
			commentRepoStub([makeComment({ text: "TEXTO REAL DO COMENTÁRIO" })]),
			userRepoStub(true),
		);

		await uc.execute({ ...base });

		expect(created[0].commentText).toBe("TEXTO REAL DO COMENTÁRIO");
		expect(created[0].commentId).toBe("c1");
		expect(created[0].verseReference).toBe("JO 3:16");
	});

	it("maps body to question and preserves line breaks", async () => {
		const { repo, created } = capturingDiscussionRepo();
		const uc = new CreateDiscussionUseCase(
			repo,
			commentRepoStub([makeComment()]),
			userRepoStub(true),
		);

		await uc.execute({ ...base, body: "linha 1\nlinha 2" });

		expect(created[0].question).toBe("linha 1\nlinha 2");
	});

	it("strips line breaks from the title", async () => {
		const { repo, created } = capturingDiscussionRepo();
		const uc = new CreateDiscussionUseCase(
			repo,
			commentRepoStub([makeComment()]),
			userRepoStub(true),
		);

		await uc.execute({ ...base, title: "linha 1\nlinha 2" });

		expect(created[0].title).toBe("linha 1 linha 2");
	});

	it("keeps a valid highlighted excerpt range", async () => {
		const { repo, created } = capturingDiscussionRepo();
		const uc = new CreateDiscussionUseCase(
			repo,
			commentRepoStub([makeComment({ text: "0123456789" })]),
			userRepoStub(true),
		);

		await uc.execute({ ...base, quoteStart: 2, quoteEnd: 5 });

		expect(created[0].quoteStart).toBe(2);
		expect(created[0].quoteEnd).toBe(5);
	});

	it("drops an out-of-range or inverted excerpt range", async () => {
		const { repo, created } = capturingDiscussionRepo();
		const uc = new CreateDiscussionUseCase(
			repo,
			commentRepoStub([makeComment({ text: "short" })]),
			userRepoStub(true),
		);

		await uc.execute({ ...base, quoteStart: 3, quoteEnd: 99 });

		expect(created[0].quoteStart).toBeUndefined();
		expect(created[0].quoteEnd).toBeUndefined();
	});

	it("throws when the linked comment does not exist", async () => {
		const { repo } = capturingDiscussionRepo();
		const uc = new CreateDiscussionUseCase(
			repo,
			commentRepoStub([]),
			userRepoStub(true),
		);

		await expect(uc.execute({ ...base, commentId: "missing" })).rejects.toThrow(
			"Comment not found",
		);
	});

	it("throws when the author's email is not verified", async () => {
		const { repo } = capturingDiscussionRepo();
		const uc = new CreateDiscussionUseCase(
			repo,
			commentRepoStub([makeComment()]),
			userRepoStub(false),
		);

		await expect(uc.execute({ ...base })).rejects.toBeInstanceOf(
			EmailNotVerifiedError,
		);
	});
});

function editableDiscussionRepo(seed: Partial<Discussion> & { _id: string }) {
	let current = { ...seed } as Discussion & { _id: string };
	return {
		repo: {
			findById: async (id: string) =>
				id === current._id ? { ...current } : null,
			update: async (
				id: string,
				patch: { title: string; question: string },
			) => {
				if (id !== current._id) return null;
				current = { ...current, ...patch, updatedAt: new Date() };
				return { ...current };
			},
		},
		get: () => current,
	};
}

describe("UpdateDiscussionUseCase", () => {
	const seed = {
		_id: "d1",
		bookAbbrev: "jo",
		username: "bob",
		verseReference: "JO 3:16",
		verseText: "",
		commentText: "snapshot imutável",
		title: "Título antigo",
		question: "corpo antigo",
		createdAt: new Date("2026-01-01T00:00:00Z"),
		updatedAt: new Date("2026-01-01T00:00:00Z"),
	};

	it("lets the author edit title and body", async () => {
		const { repo, get } = editableDiscussionRepo(seed);
		const uc = new UpdateDiscussionUseCase(repo as never);
		const result = await uc.execute("d1", "bob", false, {
			title: "Título novo",
			body: "corpo novo",
		});
		expect(result.title).toBe("Título novo");
		expect(result.question).toBe("corpo novo");
		expect(get().commentText).toBe("snapshot imutável");
	});

	it("strips line breaks from the edited title", async () => {
		const { repo } = editableDiscussionRepo(seed);
		const uc = new UpdateDiscussionUseCase(repo as never);
		const result = await uc.execute("d1", "bob", false, {
			title: "linha 1\nlinha 2",
			body: "corpo",
		});
		expect(result.title).toBe("linha 1 linha 2");
	});

	it("lets a moderator edit someone else's discussion", async () => {
		const { repo } = editableDiscussionRepo(seed);
		const uc = new UpdateDiscussionUseCase(repo as never);
		const result = await uc.execute("d1", "carol", true, {
			title: "Moderado",
			body: "corpo",
		});
		expect(result.title).toBe("Moderado");
	});

	it("rejects a non-author non-moderator", async () => {
		const { repo } = editableDiscussionRepo(seed);
		const uc = new UpdateDiscussionUseCase(repo as never);
		await expect(
			uc.execute("d1", "carol", false, { title: "x", body: "y" }),
		).rejects.toThrow("Unauthorized");
	});

	it("throws when the discussion does not exist", async () => {
		const { repo } = editableDiscussionRepo(seed);
		const uc = new UpdateDiscussionUseCase(repo as never);
		await expect(
			uc.execute("missing", "bob", false, { title: "x", body: "y" }),
		).rejects.toThrow("Discussion not found");
	});
});

describe("GetDiscussionsByCommentUseCase", () => {
	const discussions: Discussion[] = [
		{
			_id: "d1",
			bookAbbrev: "jo",
			commentId: "c1",
			username: "bob",
			verseReference: "JO 3:16",
			verseText: "",
			commentText: "",
			question: "q1",
		} as unknown as Discussion,
		{
			_id: "d2",
			bookAbbrev: "jo",
			commentId: "c1",
			username: "ana",
			verseReference: "JO 3:16",
			verseText: "",
			commentText: "",
			question: "q2",
		} as unknown as Discussion,
	];

	function discussionRepoStub(
		seed: Discussion[],
	): IDiscussionRepository {
		return {
			findByCommentId: (commentId: string) =>
				Promise.resolve(seed.filter((d) => d.commentId === commentId)),
		} as unknown as IDiscussionRepository;
	}

	function answerRepoStub(): IDiscussionAnswerRepository {
		return {
			countByDiscussion: (_ids: string[]) =>
				Promise.resolve(new Map([["d1", 2]])),
		} as unknown as IDiscussionAnswerRepository;
	}

	it("returns discussions with answersCount populated when answerRepo is wired", async () => {
		const uc = new GetDiscussionsByCommentUseCase(
			discussionRepoStub(discussions),
			answerRepoStub(),
		);
		const result = await uc.execute("c1");
		expect(result).toHaveLength(2);
		expect(result[0].answersCount).toBe(2);
		expect(result[1].answersCount).toBe(0);
	});

	it("returns discussions unmodified when answerRepo is not wired", async () => {
		const uc = new GetDiscussionsByCommentUseCase(
			discussionRepoStub(discussions),
		);
		const result = await uc.execute("c1");
		expect(result).toHaveLength(2);
		expect(result[0].answersCount).toBeUndefined();
	});

	it("enriches likeCount and authorEmailVerified in batch", async () => {
		const likeRepo = {
			countByTargets: async () => new Map([["d1", 5]]),
		} as unknown as IDiscussionLikeRepository;
		const userRepo = {
			findByUsernames: async () => [
				{ username: "bob", emailVerifiedAt: new Date() },
			],
		} as unknown as IUserRepository;

		const uc = new GetDiscussionsByCommentUseCase(
			discussionRepoStub(discussions),
			undefined,
			likeRepo,
			userRepo,
		);
		const result = await uc.execute("c1");
		expect(result[0].likeCount).toBe(5);
		expect(result[1].likeCount).toBe(0);
		expect(result[0].authorEmailVerified).toBe(true);
		expect(result[1].authorEmailVerified).toBe(false);
	});
});
