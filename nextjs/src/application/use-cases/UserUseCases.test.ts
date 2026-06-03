import { describe, it, expect, vi } from "vitest";
import {
	SetModeratorUseCase,
	SetUserDisabledUseCase,
	DeleteUserUseCase,
	ListUsersForModerationUseCase,
	MarkTutorialCompletedUseCase,
	UpdateUsernameUseCase,
	ANONYMIZED_USERNAME,
} from "./UserUseCases";
import type { IUserRepository } from "@/domain/repositories/IUserRepository";
import type { ICommentRepository } from "@/domain/repositories/ICommentRepository";
import type { ICommentLikeRepository } from "@/domain/repositories/ICommentLikeRepository";
import type { IDiscussionLikeRepository } from "@/domain/repositories/IDiscussionLikeRepository";
import type { ICommentReportRepository } from "@/domain/repositories/ICommentReportRepository";
import type { IDiscussionRepository } from "@/domain/repositories/IDiscussionRepository";
import type { IDiscussionAnswerRepository } from "@/domain/repositories/IDiscussionAnswerRepository";
import type { INotificationRepository } from "@/domain/repositories/INotificationRepository";
import type { User } from "@/domain/entities/User";

function fakeUser(overrides: Partial<User> = {}): User {
	return {
		_id: "u1",
		email: "alice@example.com",
		username: "alice",
		password: "$2b$12$hash",
		moderator: false,
		...overrides,
	};
}

function noopCommentRepo() {
	return {
		anonymizeByUsername: vi.fn().mockResolvedValue(0),
	} as unknown as ICommentRepository;
}

function noopCommentLikeRepo() {
	return {
		deleteAllByUser: vi.fn().mockResolvedValue(0),
	} as unknown as ICommentLikeRepository;
}

function noopDiscussionLikeRepo() {
	return {
		deleteAllByUser: vi.fn().mockResolvedValue(0),
		findLikedDiscussionIds: vi.fn().mockResolvedValue([]),
	} as unknown as IDiscussionLikeRepository;
}

function noopCommentReportRepo() {
	return {
		deleteAllByUser: vi.fn().mockResolvedValue(0),
	} as unknown as ICommentReportRepository;
}

function noopDiscussionRepo() {
	return {
		anonymizeByUsername: vi.fn().mockResolvedValue(0),
		decrementLikeCountMany: vi.fn().mockResolvedValue(undefined),
	} as unknown as IDiscussionRepository;
}

function noopDiscussionAnswerRepo() {
	return {
		anonymizeByUser: vi.fn().mockResolvedValue(0),
	} as unknown as IDiscussionAnswerRepository;
}

function noopNotificationRepo() {
	return {
		deleteForUser: vi.fn().mockResolvedValue(0),
		renameUsername: vi.fn().mockResolvedValue(0),
	} as unknown as INotificationRepository;
}

describe("SetModeratorUseCase", () => {
	it("delegates to repo.update with the new moderator flag and returns the result", async () => {
		const update = vi.fn().mockResolvedValue(fakeUser({ moderator: true }));
		const repo = { update } as unknown as IUserRepository;
		const useCase = new SetModeratorUseCase(repo);

		const result = await useCase.execute("alice@example.com", true);

		expect(update).toHaveBeenCalledWith("alice@example.com", {
			moderator: true,
		});
		expect(result.moderator).toBe(true);
	});

	it("can demote a moderator", async () => {
		const update = vi.fn().mockResolvedValue(fakeUser({ moderator: false }));
		const repo = { update } as unknown as IUserRepository;
		const useCase = new SetModeratorUseCase(repo);

		const result = await useCase.execute("alice@example.com", false);

		expect(update).toHaveBeenCalledWith("alice@example.com", {
			moderator: false,
		});
		expect(result.moderator).toBe(false);
	});

	it("throws 'User not found' when the email does not exist", async () => {
		const update = vi.fn().mockResolvedValue(null);
		const repo = { update } as unknown as IUserRepository;
		const useCase = new SetModeratorUseCase(repo);

		await expect(useCase.execute("ghost@example.com", true)).rejects.toThrow(
			"User not found",
		);
	});
});

describe("SetUserDisabledUseCase", () => {
	it("disables the account and cascade-hides the user's comments", async () => {
		const setDisabled = vi.fn().mockResolvedValue(
			fakeUser({
				username: "alice",
				disabledAt: new Date(),
				disabledBy: "mod-jane",
			}),
		);
		const userRepo = { setDisabled } as unknown as IUserRepository;
		const hideAllByUsername = vi.fn().mockResolvedValue(3);
		const unhideAllByUsernameCascade = vi.fn().mockResolvedValue(0);
		const commentRepo = {
			hideAllByUsername,
			unhideAllByUsernameCascade,
		} as unknown as ICommentRepository;

		const result = await new SetUserDisabledUseCase(
			userRepo,
			commentRepo,
		).execute("alice@example.com", true, "mod-jane");

		expect(setDisabled).toHaveBeenCalledWith(
			"alice@example.com",
			true,
			"mod-jane",
		);
		expect(hideAllByUsername).toHaveBeenCalledWith("alice", "mod-jane");
		expect(unhideAllByUsernameCascade).not.toHaveBeenCalled();
		expect(result.disabledAt).toBeInstanceOf(Date);
	});

	it("re-enables the account and un-hides only the cascade-hidden comments", async () => {
		const setDisabled = vi
			.fn()
			.mockResolvedValue(fakeUser({ username: "alice" }));
		const userRepo = { setDisabled } as unknown as IUserRepository;
		const hideAllByUsername = vi.fn().mockResolvedValue(0);
		const unhideAllByUsernameCascade = vi.fn().mockResolvedValue(3);
		const commentRepo = {
			hideAllByUsername,
			unhideAllByUsernameCascade,
		} as unknown as ICommentRepository;

		await new SetUserDisabledUseCase(userRepo, commentRepo).execute(
			"alice@example.com",
			false,
			"mod-jane",
		);

		// `by` is null on re-enable â€” there is no "disabled by" to record.
		expect(setDisabled).toHaveBeenCalledWith("alice@example.com", false, null);
		expect(unhideAllByUsernameCascade).toHaveBeenCalledWith("alice");
		expect(hideAllByUsername).not.toHaveBeenCalled();
	});

	it("throws 'User not found' when the email does not exist", async () => {
		const setDisabled = vi.fn().mockResolvedValue(null);
		const userRepo = { setDisabled } as unknown as IUserRepository;
		const commentRepo = {
			hideAllByUsername: vi.fn(),
			unhideAllByUsernameCascade: vi.fn(),
		} as unknown as ICommentRepository;

		await expect(
			new SetUserDisabledUseCase(userRepo, commentRepo).execute(
				"ghost@example.com",
				true,
				"mod",
			),
		).rejects.toThrow("User not found");
	});
});

describe("ListUsersForModerationUseCase", () => {
	it("delegates to repo.findForModeration with the provided opts", async () => {
		const items = [
			{
				_id: "u1",
				username: "alice",
				email: "alice@example.com",
				moderator: false,
				createdAt: new Date("2026-05-20T12:00:00Z"),
			},
		];
		const cursor = { createdAt: new Date("2026-05-19T00:00:00Z"), id: "u0" };
		const findForModeration = vi.fn().mockResolvedValue({
			items,
			nextCursor: null,
		});
		const repo = { findForModeration } as unknown as IUserRepository;
		const useCase = new ListUsersForModerationUseCase(repo);

		const result = await useCase.execute({ q: "ali", cursor, limit: 20 });

		expect(findForModeration).toHaveBeenCalledWith({
			q: "ali",
			cursor,
			limit: 20,
		});
		expect(result.items).toEqual(items);
		expect(result.nextCursor).toBeNull();
	});

	it("returns the repo's nextCursor unchanged when more pages remain", async () => {
		const nextCursor = {
			createdAt: new Date("2026-05-18T10:00:00Z"),
			id: "u9",
		};
		const findForModeration = vi.fn().mockResolvedValue({
			items: [],
			nextCursor,
		});
		const repo = { findForModeration } as unknown as IUserRepository;
		const useCase = new ListUsersForModerationUseCase(repo);

		const result = await useCase.execute({ limit: 5 });

		expect(result.nextCursor).toEqual(nextCursor);
	});
});

describe("DeleteUserUseCase", () => {
	it("allows a moderator to delete any user", async () => {
		const findByEmail = vi
			.fn()
			.mockResolvedValue(
				fakeUser({ email: "victim@example.com", username: "victim" }),
			);
		const del = vi.fn(() => Promise.resolve());
		const userRepo = { findByEmail, delete: del } as unknown as IUserRepository;
		const useCase = new DeleteUserUseCase(
			userRepo,
			noopCommentRepo(),
			noopCommentLikeRepo(),
			noopDiscussionLikeRepo(),
			noopCommentReportRepo(),
			noopDiscussionRepo(),
			noopDiscussionAnswerRepo(),
			noopNotificationRepo(),
		);

		await useCase.execute("mod@example.com", "victim@example.com", true);

		expect(del).toHaveBeenCalledWith("victim@example.com");
	});

	it("allows a regular user to delete only themselves", async () => {
		const findByEmail = vi
			.fn()
			.mockResolvedValue(fakeUser({ email: "alice@example.com" }));
		const del = vi.fn(() => Promise.resolve());
		const userRepo = { findByEmail, delete: del } as unknown as IUserRepository;
		const useCase = new DeleteUserUseCase(
			userRepo,
			noopCommentRepo(),
			noopCommentLikeRepo(),
			noopDiscussionLikeRepo(),
			noopCommentReportRepo(),
			noopDiscussionRepo(),
			noopDiscussionAnswerRepo(),
			noopNotificationRepo(),
		);

		await useCase.execute("alice@example.com", "alice@example.com", false);

		expect(del).toHaveBeenCalledWith("alice@example.com");
	});

	it("throws Unauthorized when a non-moderator targets another user", async () => {
		const findByEmail = vi
			.fn()
			.mockResolvedValue(fakeUser({ email: "victim@example.com" }));
		const del = vi.fn();
		const userRepo = { findByEmail, delete: del } as unknown as IUserRepository;
		const useCase = new DeleteUserUseCase(
			userRepo,
			noopCommentRepo(),
			noopCommentLikeRepo(),
			noopDiscussionLikeRepo(),
			noopCommentReportRepo(),
			noopDiscussionRepo(),
			noopDiscussionAnswerRepo(),
			noopNotificationRepo(),
		);

		await expect(
			useCase.execute("attacker@example.com", "victim@example.com", false),
		).rejects.toThrow("Unauthorized");
		expect(del).not.toHaveBeenCalled();
	});

	it("anonymizes comments/discussions and removes notifications before deleting the user (LGPD cascade)", async () => {
		const findByEmail = vi
			.fn()
			.mockResolvedValue(fakeUser({ username: "alice" }));
		const del = vi.fn(() => Promise.resolve());
		const userRepo = { findByEmail, delete: del } as unknown as IUserRepository;

		const commentRepo = noopCommentRepo();
		const commentLikeRepo = noopCommentLikeRepo();
		const discussionLikeRepo = noopDiscussionLikeRepo();
		const commentReportRepo = noopCommentReportRepo();
		const discussionRepo = noopDiscussionRepo();
		const discussionAnswerRepo = noopDiscussionAnswerRepo();
		const notifRepo = noopNotificationRepo();

		const useCase = new DeleteUserUseCase(
			userRepo,
			commentRepo,
			commentLikeRepo,
			discussionLikeRepo,
			commentReportRepo,
			discussionRepo,
			discussionAnswerRepo,
			notifRepo,
		);
		await useCase.execute("alice@example.com", "alice@example.com", false);

		expect(commentRepo.anonymizeByUsername).toHaveBeenCalledWith(
			"alice",
			ANONYMIZED_USERNAME,
		);
		expect(commentLikeRepo.deleteAllByUser).toHaveBeenCalledWith("u1");
		expect(discussionLikeRepo.deleteAllByUser).toHaveBeenCalledWith("u1");
		expect(commentReportRepo.deleteAllByUser).toHaveBeenCalledWith("u1");
		expect(discussionRepo.anonymizeByUsername).toHaveBeenCalledWith(
			"alice",
			ANONYMIZED_USERNAME,
		);
		expect(discussionAnswerRepo.anonymizeByUser).toHaveBeenCalledWith(
			"u1",
			ANONYMIZED_USERNAME,
		);
		expect(notifRepo.deleteForUser).toHaveBeenCalledWith("alice");
		expect(del).toHaveBeenCalledWith("alice@example.com");
	});

	it("decrements likeCount for each discussion the user had liked, capturing ids before the like cascade", async () => {
		const findByEmail = vi
			.fn()
			.mockResolvedValue(fakeUser({ username: "alice", _id: "u1" }));
		const del = vi.fn(() => Promise.resolve());
		const userRepo = { findByEmail, delete: del } as unknown as IUserRepository;

		const commentRepo = noopCommentRepo();
		const commentLikeRepo = noopCommentLikeRepo();
		const discussionLikeRepo = noopDiscussionLikeRepo();
		const commentReportRepo = noopCommentReportRepo();
		const discussionRepo = noopDiscussionRepo();
		const discussionAnswerRepo = noopDiscussionAnswerRepo();
		const notifRepo = noopNotificationRepo();

		// The user had liked two discussions.
		(
			discussionLikeRepo.findLikedDiscussionIds as ReturnType<typeof vi.fn>
		).mockResolvedValue(["d1", "d2"]);

		// Guard ordering: capture-before-delete. If deleteAllByUser runs first
		// it would (in reality) wipe the rows findLikedDiscussionIds reads, so we
		// assert findLikedDiscussionIds is invoked before deleteAllByUser.
		const order: string[] = [];
		(
			discussionLikeRepo.findLikedDiscussionIds as ReturnType<typeof vi.fn>
		).mockImplementation(async () => {
			order.push("find");
			return ["d1", "d2"];
		});
		(
			discussionLikeRepo.deleteAllByUser as ReturnType<typeof vi.fn>
		).mockImplementation(async () => {
			order.push("deleteAll");
			return 2;
		});

		const useCase = new DeleteUserUseCase(
			userRepo,
			commentRepo,
			commentLikeRepo,
			discussionLikeRepo,
			commentReportRepo,
			discussionRepo,
			discussionAnswerRepo,
			notifRepo,
		);
		await useCase.execute("alice@example.com", "alice@example.com", false);

		expect(discussionLikeRepo.findLikedDiscussionIds).toHaveBeenCalledWith(
			"u1",
		);
		expect(discussionRepo.decrementLikeCountMany).toHaveBeenCalledWith([
			"d1",
			"d2",
		]);
		// capture happened before the likes were dropped.
		expect(order.indexOf("find")).toBeLessThan(order.indexOf("deleteAll"));

		// answersCount is denormalized per-discussion and must NOT be touched:
		// answers are anonymized, not removed, so no answer-count method runs.
		const dr = discussionRepo as unknown as Record<string, unknown>;
		expect(dr.incrementAnswersCount).toBeUndefined();
		expect(dr.decrementAnswersCount).toBeUndefined();
	});
});

describe("MarkTutorialCompletedUseCase", () => {
	it("delegates the email and tutorial name to the repo", async () => {
		const markTutorialCompleted = vi.fn(() => Promise.resolve());
		const repo = { markTutorialCompleted } as unknown as IUserRepository;
		const useCase = new MarkTutorialCompletedUseCase(repo);

		await useCase.execute("alice@example.com", "chapter-v1");

		expect(markTutorialCompleted).toHaveBeenCalledWith(
			"alice@example.com",
			"chapter-v1",
		);
	});

	it("is idempotent â€” repeated calls just delegate again (repo enforces $addToSet)", async () => {
		const markTutorialCompleted = vi.fn(() => Promise.resolve());
		const repo = { markTutorialCompleted } as unknown as IUserRepository;
		const useCase = new MarkTutorialCompletedUseCase(repo);

		await useCase.execute("alice@example.com", "chapter-v1");
		await useCase.execute("alice@example.com", "chapter-v1");

		expect(markTutorialCompleted).toHaveBeenCalledTimes(2);
	});

	it("rejects empty/non-string tutorial names without touching the repo", async () => {
		const markTutorialCompleted = vi.fn();
		const repo = { markTutorialCompleted } as unknown as IUserRepository;
		const useCase = new MarkTutorialCompletedUseCase(repo);

		await expect(useCase.execute("alice@example.com", "")).rejects.toThrow(
			"Invalid tutorial name",
		);
		expect(markTutorialCompleted).not.toHaveBeenCalled();
	});
});

describe("UpdateUsernameUseCase", () => {
	function setup(
		opts: {
			user?: User | null;
			takenSlug?: string;
		} = {},
	) {
		const findByEmail = vi
			.fn()
			.mockResolvedValue(opts.user === undefined ? fakeUser() : opts.user);
		const findByUsername = vi.fn((slug: string) =>
			Promise.resolve(
				opts.takenSlug === slug
					? fakeUser({ username: slug, _id: "u-other" })
					: null,
			),
		);
		const update = vi.fn((_email: string, data: Partial<User>) =>
			Promise.resolve(fakeUser({ username: data.username ?? "alice" })),
		);
		const userRepo = {
			findByEmail,
			findByUsername,
			update,
		} as unknown as IUserRepository;

		const commentRename = vi.fn().mockResolvedValue(2);
		const discussionRename = vi.fn().mockResolvedValue(1);
		const answerRename = vi.fn().mockResolvedValue(3);
		const notifRename = vi.fn().mockResolvedValue(4);

		const commentRepo = {
			anonymizeByUsername: commentRename,
		} as unknown as ICommentRepository;
		const discussionRepo = {
			anonymizeByUsername: discussionRename,
		} as unknown as IDiscussionRepository;
		const answerRepo = {
			anonymizeByUser: answerRename,
		} as unknown as IDiscussionAnswerRepository;
		const notifRepo = {
			renameUsername: notifRename,
		} as unknown as INotificationRepository;

		return {
			useCase: new UpdateUsernameUseCase(
				userRepo,
				commentRepo,
				discussionRepo,
				answerRepo,
				notifRepo,
			),
			update,
			commentRename,
			discussionRename,
			answerRename,
			notifRename,
		};
	}

	it("renames the user and cascades to comments/discussions/answers/notifications", async () => {
		const {
			useCase,
			update,
			commentRename,
			discussionRename,
			answerRename,
			notifRename,
		} = setup();

		const result = await useCase.execute("alice@example.com", "alice-2");

		expect(update).toHaveBeenCalledWith("alice@example.com", {
			username: "alice-2",
		});
		expect(commentRename).toHaveBeenCalledWith("alice", "alice-2");
		expect(discussionRename).toHaveBeenCalledWith("alice", "alice-2");
		expect(answerRename).toHaveBeenCalledWith("u1", "alice-2");
		expect(notifRename).toHaveBeenCalledWith("alice", "alice-2");
		expect(result.username).toBe("alice-2");
	});

	it("rejects an invalid slug format", async () => {
		const { useCase, update } = setup();

		await expect(
			useCase.execute("alice@example.com", "Has Space"),
		).rejects.toThrow("Invalid username format");
		expect(update).not.toHaveBeenCalled();
	});

	it("rejects when the new slug is already taken", async () => {
		const { useCase, update } = setup({ takenSlug: "bob" });

		await expect(useCase.execute("alice@example.com", "bob")).rejects.toThrow(
			"Username already taken",
		);
		expect(update).not.toHaveBeenCalled();
	});

	it("is a noop when the slug is unchanged", async () => {
		const { useCase, update, commentRename } = setup();

		const result = await useCase.execute("alice@example.com", "alice");

		expect(update).not.toHaveBeenCalled();
		expect(commentRename).not.toHaveBeenCalled();
		expect(result.username).toBe("alice");
	});

	it("throws when the user doesn't exist", async () => {
		const { useCase } = setup({ user: null });

		await expect(useCase.execute("ghost@example.com", "valid")).rejects.toThrow(
			"User not found",
		);
	});
});
