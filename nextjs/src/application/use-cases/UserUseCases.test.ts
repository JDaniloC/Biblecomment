import { describe, it, expect, vi } from "vitest";
import {
	SetModeratorUseCase,
	SetUserDisabledUseCase,
	DeleteUserUseCase,
	ListUsersForModerationUseCase,
	MarkTutorialCompletedUseCase,
	UpdateUsernameUseCase,
	ANONYMIZED_USERNAME,
	DELETED_USER_ID,
	DeletionIncompleteError,
	FinishPendingDeletionsUseCase,
	FinishPendingRenamesUseCase,
} from "./UserUseCases";
import {
	makeCommunityRepo,
	makeFollowRepo,
	makeMembershipRepo,
} from "./__fakes__/communityRepos";
import type { IUserRepository } from "@/domain/repositories/IUserRepository";
import type { ICommentRepository } from "@/domain/repositories/ICommentRepository";
import type { ICommentLikeRepository } from "@/domain/repositories/ICommentLikeRepository";
import type { IDiscussionLikeRepository } from "@/domain/repositories/IDiscussionLikeRepository";
import type { ICommentReportRepository } from "@/domain/repositories/ICommentReportRepository";
import type { IDiscussionRepository } from "@/domain/repositories/IDiscussionRepository";
import type { IDiscussionAnswerRepository } from "@/domain/repositories/IDiscussionAnswerRepository";
import type { INotificationRepository } from "@/domain/repositories/INotificationRepository";
import type { IFollowRepository } from "@/domain/repositories/IFollowRepository";
import type { IUserChapterReadRepository } from "@/domain/repositories/IUserChapterReadRepository";
import type { IReadingSessionRepository } from "@/domain/repositories/IReadingSessionRepository";
import type { IReadingReminderPreferenceRepository } from "@/domain/repositories/IReadingReminderPreferenceRepository";
import type { IPushSubscriptionRepository } from "@/domain/repositories/IPushSubscriptionRepository";
import type { IEmailVerificationTokenRepository } from "@/domain/repositories/IEmailVerificationTokenRepository";
import type { IPasswordResetTokenRepository } from "@/domain/repositories/IPasswordResetTokenRepository";
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
	type Harness = ReturnType<typeof makeHarness>;

	/**
	 * Stateful user + community repos (so counters and hand-over are real)
	 * and recording mocks for every other collection the cascade touches.
	 */
	function makeHarness(users: User[] = [fakeUser()]) {
		const byId = new Map(users.map((u) => [u._id!, { ...u }]));
		const order: string[] = [];
		const track =
			<T>(name: string, value: T) =>
			async () => {
				order.push(name);
				return value;
			};

		const user = {
			findByEmail: vi.fn(
				async (email: string) =>
					[...byId.values()].find((u) => u.email === email) ?? null,
			),
			findManyByIds: vi.fn(async (ids: string[]) =>
				ids.map((id) => byId.get(id)).filter((u): u is User => !!u),
			),
			beginDeletion: vi.fn(
				async (
					id: string,
					snap: { communityIds: string[]; discussionIds: string[] },
				) => {
					order.push("beginDeletion");
					const u = byId.get(id);
					if (!u) return null;
					const prev = u.deletion ?? {
						requestedAt: new Date(),
						communityIds: [],
						discussionIds: [],
					};
					u.deletion = {
						requestedAt: prev.requestedAt,
						communityIds: [...new Set([...prev.communityIds, ...snap.communityIds])],
						discussionIds: [
							...new Set([...prev.discussionIds, ...snap.discussionIds]),
						],
					};
					return u.deletion;
				},
			),
			deleteById: vi.fn(async (id: string) => {
				order.push("deleteById");
				return byId.delete(id);
			}),
			replaceDisabledBy: vi.fn(track("replaceDisabledBy", 0)),
		};

		const community = makeCommunityRepo();
		const communityMembership = makeMembershipRepo();
		const communityFollow = makeFollowRepo();

		// Remaining discussion likes after the user's are gone, per discussion.
		const remainingLikes = new Map<string, number>();
		const discussionLike = {
			findLikedDiscussionIds: vi.fn(async () => [] as string[]),
			deleteAllByUser: vi.fn(track("discussionLike.deleteAllByUser", 0)),
			countByTargets: vi.fn(
				async (_type: string, ids: string[]) =>
					new Map(
						ids
							.filter((id) => remainingLikes.has(id))
							.map((id) => [id, remainingLikes.get(id)!]),
					),
			),
		};

		const repos = {
			user: user as unknown as IUserRepository,
			comment: {
				anonymizeByUsername: vi.fn(track("comment.anonymizeByUsername", 0)),
				replaceModeratorRefs: vi.fn(track("comment.replaceModeratorRefs", 0)),
			} as unknown as ICommentRepository,
			commentLike: {
				deleteAllByUser: vi.fn(track("commentLike.deleteAllByUser", 0)),
			} as unknown as ICommentLikeRepository,
			commentReport: {
				deleteAllByUser: vi.fn(track("commentReport.deleteAllByUser", 0)),
			} as unknown as ICommentReportRepository,
			discussion: {
				anonymizeByUsername: vi.fn(track("discussion.anonymizeByUsername", 0)),
				setLikeCounts: vi.fn(track("discussion.setLikeCounts", undefined)),
			} as unknown as IDiscussionRepository,
			discussionLike: discussionLike as unknown as IDiscussionLikeRepository,
			discussionAnswer: {
				detachUser: vi.fn(track("discussionAnswer.detachUser", 0)),
			} as unknown as IDiscussionAnswerRepository,
			notification: {
				deleteForUser: vi.fn(track("notification.deleteForUser", 0)),
				create: vi.fn(async (n: unknown) => n),
			} as unknown as INotificationRepository,
			community,
			communityMembership,
			communityFollow,
			follow: {
				removeAllForUser: vi.fn(track("follow.removeAllForUser", 0)),
			} as unknown as IFollowRepository,
			chapterRead: {
				deleteAllByUser: vi.fn(track("chapterRead.deleteAllByUser", 0)),
			} as unknown as IUserChapterReadRepository,
			readingSession: {
				deleteAllByUser: vi.fn(track("readingSession.deleteAllByUser", 0)),
			} as unknown as IReadingSessionRepository,
			readingReminder: {
				deleteByUsername: vi.fn(track("readingReminder.deleteByUsername", undefined)),
			} as unknown as IReadingReminderPreferenceRepository,
			pushSubscription: {
				deleteAllByUsername: vi.fn(track("pushSubscription.deleteAllByUsername", 0)),
			} as unknown as IPushSubscriptionRepository,
			emailVerificationToken: {
				deleteByUserId: vi.fn(track("emailVerificationToken.deleteByUserId", undefined)),
			} as unknown as IEmailVerificationTokenRepository,
			passwordResetToken: {
				deleteByUserId: vi.fn(track("passwordResetToken.deleteByUserId", undefined)),
			} as unknown as IPasswordResetTokenRepository,
		};

		// Record every community write too, so ordering assertions cover the
		// hand-over step as well as the cascade.
		for (const name of ["setCreatedBy", "deleteById", "setCounters"] as const) {
			const original = community[name].bind(community) as (...a: unknown[]) => unknown;
			(community as unknown as Record<string, unknown>)[name] = async (...a: unknown[]) => {
				order.push(`community.${name}`);
				return original(...a);
			};
		}
		const seedCreator = communityMembership.seedCreator.bind(communityMembership);
		communityMembership.seedCreator = async (u, c) => {
			order.push("communityMembership.seedCreator");
			return seedCreator(u, c);
		};
		const onMarked = vi.fn((id: string) => order.push(`onMarked:${id}`));

		return {
			repos,
			useCase: new DeleteUserUseCase(repos, { onMarked }),
			onMarked,
			users: byId,
			user,
			discussionLike,
			remainingLikes,
			order,
		};
	}

	/** Create a community in the harness and seed its join rows + counters. */
	async function seedCommunity(
		h: Harness,
		slug: string,
		createdBy: string,
		members: Array<{
			userId: string;
			status?: "pending" | "approved";
			role?: "member" | "moderator";
			follows?: boolean;
		}>,
	) {
		const c = await h.repos.community.create({
			slug,
			name: slug,
			description: "",
			createdBy,
		});
		for (const m of members) {
			h.repos.communityMembership._rows.set(`${m.userId}::${c._id}`, {
				status: m.status ?? "approved",
				role: m.role ?? "member",
			});
			if (m.follows) await h.repos.communityFollow.follow(m.userId, c._id!);
		}
		await h.repos.community.setCounters(c._id!, {
			memberCount: await h.repos.communityMembership.countApproved(c._id!),
			followerCount: await h.repos.communityFollow.countByCommunity(c._id!),
		});
		return c._id!;
	}

	const alice = () => fakeUser({ _id: "u1", email: "alice@example.com", username: "alice" });
	const bob = () => fakeUser({ _id: "u2", email: "bob@example.com", username: "bob" });
	const carol = () => fakeUser({ _id: "u3", email: "carol@example.com", username: "carol" });

	it("allows a moderator to delete any user", async () => {
		const h = makeHarness([alice(), fakeUser({ _id: "m1", email: "mod@example.com" })]);

		const result = await h.useCase.execute("mod@example.com", "alice@example.com", true);

		expect(result).toEqual({ userId: "u1" });
		expect(h.user.deleteById).toHaveBeenCalledWith("u1");
		expect(h.users.has("u1")).toBe(false);
	});

	it("allows a regular user to delete only themselves", async () => {
		const h = makeHarness([alice()]);

		await h.useCase.execute("alice@example.com", "alice@example.com", false);

		expect(h.user.deleteById).toHaveBeenCalledWith("u1");
	});

	it("throws Unauthorized when a non-moderator targets another user", async () => {
		const h = makeHarness([alice(), bob()]);

		await expect(
			h.useCase.execute("bob@example.com", "alice@example.com", false),
		).rejects.toThrow("Unauthorized");
		expect(h.user.beginDeletion).not.toHaveBeenCalled();
		expect(h.user.deleteById).not.toHaveBeenCalled();
	});

	it("throws User not found for an unknown account", async () => {
		const h = makeHarness([]);

		await expect(
			h.useCase.execute("ghost@example.com", "ghost@example.com", false),
		).rejects.toThrow("User not found");
		expect(h.user.deleteById).not.toHaveBeenCalled();
	});

	it("removes or anonymizes every record keyed to the user (LGPD cascade)", async () => {
		const h = makeHarness([alice()]);
		const r = h.repos;

		await h.useCase.execute("alice@example.com", "alice@example.com", false);

		expect(r.comment.anonymizeByUsername).toHaveBeenCalledWith("alice", ANONYMIZED_USERNAME);
		expect(r.comment.replaceModeratorRefs).toHaveBeenCalledWith("alice", ANONYMIZED_USERNAME);
		expect(r.discussion.anonymizeByUsername).toHaveBeenCalledWith("alice", ANONYMIZED_USERNAME);
		expect(r.discussionAnswer.detachUser).toHaveBeenCalledWith("u1", {
			username: ANONYMIZED_USERNAME,
			userId: DELETED_USER_ID,
		});
		expect(r.user.replaceDisabledBy).toHaveBeenCalledWith("alice", ANONYMIZED_USERNAME);
		expect(r.notification.deleteForUser).toHaveBeenCalledWith("alice");
		expect(r.commentLike.deleteAllByUser).toHaveBeenCalledWith("u1");
		expect(r.commentReport.deleteAllByUser).toHaveBeenCalledWith("u1");
		expect(r.discussionLike.deleteAllByUser).toHaveBeenCalledWith("u1");
		expect(r.follow.removeAllForUser).toHaveBeenCalledWith("u1");
		expect(r.chapterRead.deleteAllByUser).toHaveBeenCalledWith("u1");
		expect(r.readingSession.deleteAllByUser).toHaveBeenCalledWith("u1");
		expect(r.emailVerificationToken.deleteByUserId).toHaveBeenCalledWith("u1");
		expect(r.passwordResetToken.deleteByUserId).toHaveBeenCalledWith("u1");
		expect(r.readingReminder.deleteByUsername).toHaveBeenCalledWith("alice");
		expect(r.pushSubscription.deleteAllByUsername).toHaveBeenCalledWith("alice");
	});

	it("also cleans the old slug of a rename that never finished", async () => {
		const h = makeHarness([fakeUser({ username: "alice-2", renameFrom: "alice" })]);
		const r = h.repos;

		await h.useCase.execute("alice@example.com", "alice@example.com", false);

		for (const slug of ["alice-2", "alice"]) {
			expect(r.comment.anonymizeByUsername).toHaveBeenCalledWith(slug, ANONYMIZED_USERNAME);
			expect(r.discussion.anonymizeByUsername).toHaveBeenCalledWith(slug, ANONYMIZED_USERNAME);
			expect(r.notification.deleteForUser).toHaveBeenCalledWith(slug);
			expect(r.pushSubscription.deleteAllByUsername).toHaveBeenCalledWith(slug);
			expect(r.readingReminder.deleteByUsername).toHaveBeenCalledWith(slug);
		}
	});

	it("marks the deletion (and drops sessions) before touching any record and deletes the user last", async () => {
		const h = makeHarness([alice(), bob()]);
		await seedCommunity(h, "owned", "u1", [
			{ userId: "u1", role: "moderator" },
			{ userId: "u2" },
		]);
		h.order.length = 0; // ignore the seeding writes

		await h.useCase.execute("alice@example.com", "alice@example.com", false);

		expect(h.order.slice(0, 2)).toEqual(["beginDeletion", "onMarked:u1"]);
		expect(h.order).toContain("community.setCreatedBy");
		expect(h.order).toContain("communityMembership.seedCreator");
		expect(h.order[h.order.length - 1]).toBe("deleteById");
		expect(h.order.length).toBeGreaterThan(10);
	});

	it("recomputes community counters: approved and follow rows drop, pending ones leave memberCount alone", async () => {
		const h = makeHarness([alice(), bob()]);
		const owner = "u-owner";
		const approvedIn = await seedCommunity(h, "approved-in", owner, [
			{ userId: owner, role: "moderator", follows: true },
			{ userId: "u1", follows: true },
			{ userId: "u2" },
		]);
		const pendingIn = await seedCommunity(h, "pending-in", owner, [
			{ userId: owner, role: "moderator" },
			{ userId: "u1", status: "pending" },
		]);
		const followsOnly = await seedCommunity(h, "follows-only", owner, [
			{ userId: owner, role: "moderator", follows: true },
		]);
		await h.repos.communityFollow.follow("u1", followsOnly);
		await h.repos.community.setCounters(followsOnly, { memberCount: 1, followerCount: 2 });

		await h.useCase.execute("alice@example.com", "alice@example.com", false);

		const get = (id: string) => h.repos.community._items.get(id)!;
		expect(get(approvedIn)).toMatchObject({ memberCount: 2, followerCount: 1 });
		expect(get(pendingIn)).toMatchObject({ memberCount: 1, followerCount: 0 });
		expect(get(followsOnly)).toMatchObject({ memberCount: 1, followerCount: 1 });
		expect(await h.repos.communityMembership.listForUser("u1")).toEqual([]);
		expect(await h.repos.communityFollow.followedCommunityIds("u1")).toEqual([]);
	});

	it("hands a created community to the senior approved moderator over older members", async () => {
		const h = makeHarness([alice(), bob(), carol()]);
		const id = await seedCommunity(h, "owned", "u1", [
			{ userId: "u1", role: "moderator", follows: true },
			{ userId: "u3" }, // carol: approved member, joined first
			{ userId: "u2", role: "moderator" }, // bob: approved moderator
		]);

		await h.useCase.execute("alice@example.com", "alice@example.com", false);

		const c = h.repos.community._items.get(id)!;
		expect(c.createdBy).toBe("u2");
		expect(c.memberCount).toBe(2);
		expect(await h.repos.communityMembership.isModerator("u2", id)).toBe(true);
		expect(h.repos.notification.create).toHaveBeenCalledWith(
			expect.objectContaining({ recipient: "bob", resourceId: id }),
		);
	});

	it("hands over to an approved member when there's no other moderator, skipping deleted accounts", async () => {
		const h = makeHarness([alice(), carol()]);
		const id = await seedCommunity(h, "owned", "u1", [
			{ userId: "u1", role: "moderator" },
			{ userId: "u-gone", role: "moderator" }, // account no longer exists
			{ userId: "u3" },
		]);

		await h.useCase.execute("alice@example.com", "alice@example.com", false);

		expect(h.repos.community._items.get(id)!.createdBy).toBe("u3");
		expect(await h.repos.communityMembership.isModerator("u3", id)).toBe(true);
	});

	it("deletes a created community nobody else can take over, with its pending requests and follows", async () => {
		const h = makeHarness([alice(), bob()]);
		const id = await seedCommunity(h, "solo", "u1", [
			{ userId: "u1", role: "moderator", follows: true },
			{ userId: "u2", status: "pending", follows: true },
		]);

		await h.useCase.execute("alice@example.com", "alice@example.com", false);

		expect(h.repos.community._items.has(id)).toBe(false);
		expect(h.repos.communityMembership._rows.size).toBe(0);
		expect(await h.repos.communityFollow.countByCommunity(id)).toBe(0);
	});

	it("recomputes the likeCount of every discussion the user had liked", async () => {
		const h = makeHarness([alice()]);
		h.discussionLike.findLikedDiscussionIds.mockResolvedValue(["d1", "d2"]);
		h.remainingLikes.set("d1", 3);

		await h.useCase.execute("alice@example.com", "alice@example.com", false);

		expect(h.discussionLike.countByTargets).toHaveBeenCalledWith("discussion", ["d1", "d2"]);
		expect(h.repos.discussion.setLikeCounts).toHaveBeenCalledWith(
			new Map([
				["d1", 3],
				["d2", 0],
			]),
		);
	});

	it("never hands a community to a disabled account or one being deleted", async () => {
		const disabledMod = fakeUser({ _id: "u2", email: "bob@example.com", username: "bob", disabledAt: new Date() });
		const deletingMod = fakeUser({
			_id: "u4",
			email: "dan@example.com",
			username: "dan",
			deletion: { requestedAt: new Date(), communityIds: [], discussionIds: [] },
		});
		const h = makeHarness([alice(), disabledMod, carol(), deletingMod]);
		const id = await seedCommunity(h, "owned", "u1", [
			{ userId: "u1", role: "moderator" },
			{ userId: "u2", role: "moderator" },
			{ userId: "u4", role: "moderator" },
			{ userId: "u3" },
		]);

		await h.useCase.execute("alice@example.com", "alice@example.com", false);

		expect(h.repos.community._items.get(id)!.createdBy).toBe("u3");
	});

	it("finishes on retry after a partial failure without double-counting", async () => {
		const h = makeHarness([alice(), bob()]);
		const id = await seedCommunity(h, "shared", "u2", [
			{ userId: "u2", role: "moderator", follows: true },
			{ userId: "u1", follows: true },
		]);
		h.discussionLike.findLikedDiscussionIds.mockResolvedValueOnce(["d1"]);
		h.remainingLikes.set("d1", 4);
		vi.mocked(h.repos.comment.anonymizeByUsername).mockRejectedValueOnce(
			new Error("Atlas timeout"),
		);

		const failure = await h.useCase
			.execute("alice@example.com", "alice@example.com", false)
			.catch((e: unknown) => e);
		expect(failure).toBeInstanceOf(DeletionIncompleteError);
		expect((failure as DeletionIncompleteError).userId).toBe("u1");
		expect((failure as Error).cause).toEqual(new Error("Atlas timeout"));
		// The account survives, flagged, with the snapshot to finish from —
		// even though alice's membership and follow rows are already gone.
		expect(h.users.get("u1")?.deletion?.communityIds).toEqual([id]);
		expect(await h.repos.communityMembership.listForUser("u1")).toEqual([]);

		// The retry no longer sees those rows (or the like) but still repairs
		// the counters from the stored snapshot, exactly once.
		await h.useCase.execute("alice@example.com", "alice@example.com", false);

		expect(h.repos.community._items.get(id)).toMatchObject({
			memberCount: 1,
			followerCount: 1,
		});
		expect(h.repos.discussion.setLikeCounts).toHaveBeenLastCalledWith(
			new Map([["d1", 4]]),
		);
		expect(h.users.has("u1")).toBe(false);
	});
});

describe("FinishPendingDeletionsUseCase", () => {
	it("resumes deletions past the grace period, oldest first, and keeps going after a failure", async () => {
		const now = new Date("2026-10-15T12:00:00Z");
		const findPendingDeletions = vi.fn(async () => [
			fakeUser({ _id: "u1", email: "a@example.com" }),
			fakeUser({ _id: "u2", email: "b@example.com" }),
		]);
		const execute = vi.fn(async (_req: string, target: string) => {
			if (target === "a@example.com") throw new DeletionIncompleteError("u1", new Error("x"));
			return { userId: "u2" };
		});

		const result = await new FinishPendingDeletionsUseCase(
			{ findPendingDeletions } as unknown as IUserRepository,
			{ execute } as unknown as DeleteUserUseCase,
		).execute({ now, graceMs: 5 * 60_000, limit: 10 });

		expect(findPendingDeletions).toHaveBeenCalledWith(new Date("2026-10-15T11:55:00Z"), 10);
		// Self-deletion on the account's behalf: requestor == target.
		expect(execute).toHaveBeenCalledWith("a@example.com", "a@example.com", false);
		expect(result).toEqual({
			finished: ["u2"],
			failed: [{ userId: "u1", error: "x" }],
		});
	});
});

describe("FinishPendingRenamesUseCase", () => {
	it("re-runs each pending rename towards the account's current slug", async () => {
		const findPendingRenames = vi.fn(async () => [
			fakeUser({ _id: "u1", email: "a@example.com", username: "ana-2", renameFrom: "ana" }),
			fakeUser({ _id: "u2", email: "b@example.com", username: "bia-2", renameFrom: "bia" }),
		]);
		const execute = vi.fn(async (email: string) => {
			if (email === "b@example.com") throw new Error("Atlas timeout");
			return fakeUser();
		});

		const result = await new FinishPendingRenamesUseCase(
			{ findPendingRenames } as unknown as IUserRepository,
			{ execute } as unknown as UpdateUsernameUseCase,
		).execute({ limit: 10 });

		expect(findPendingRenames).toHaveBeenCalledWith(10);
		// Same target: the use case only finishes the pending cascade.
		expect(execute).toHaveBeenCalledWith("a@example.com", "ana-2");
		expect(result).toEqual({
			finished: ["u1"],
			failed: [{ userId: "u2", error: "Atlas timeout" }],
		});
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
			/** beginRename finds the account already changed by another rename. */
			conflict?: boolean;
		} = {},
	) {
		const order: string[] = [];
		const track =
			<T>(name: string, value: T) =>
			async () => {
				order.push(name);
				return value;
			};
		const findByEmail = vi
			.fn()
			.mockResolvedValue(opts.user === undefined ? fakeUser() : opts.user);
		const isUsernameHeld = vi.fn((slug: string) =>
			Promise.resolve(opts.takenSlug === slug),
		);
		const clearRenameFrom = vi.fn(track("clearRenameFrom", undefined));
		const beginRename = vi.fn(async (_id: string, from: string, to: string) => {
			order.push("beginRename");
			return opts.conflict ? null : fakeUser({ username: to, renameFrom: from });
		});
		const disabledByRename = vi.fn(track("replaceDisabledBy", 0));
		const userRepo = {
			findByEmail,
			isUsernameHeld,
			clearRenameFrom,
			beginRename,
			replaceDisabledBy: disabledByRename,
		} as unknown as IUserRepository;

		const commentRename = vi.fn(track("comment.anonymizeByUsername", 2));
		const moderatorRefsRename = vi.fn(track("comment.replaceModeratorRefs", 0));
		const reportRename = vi.fn(track("commentReport.renameUsername", 0));
		const discussionRename = vi.fn(track("discussion.anonymizeByUsername", 1));
		const answerRename = vi.fn(track("discussionAnswer.anonymizeByUser", 3));
		const notifRename = vi.fn(track("notification.renameUsername", 4));
		const notifPurge = vi.fn(track("notification.deleteForUser", 0));
		const pushRename = vi.fn(track("pushSubscription.renameUsername", 1));
		const pushPurge = vi.fn(track("pushSubscription.deleteAllByUsername", 0));
		const reminderRename = vi.fn(track("readingReminder.renameUsername", undefined));
		const reminderPurge = vi.fn(track("readingReminder.deleteByUsername", undefined));

		return {
			useCase: new UpdateUsernameUseCase({
				user: userRepo,
				comment: {
					anonymizeByUsername: commentRename,
					replaceModeratorRefs: moderatorRefsRename,
				} as unknown as ICommentRepository,
				commentReport: {
					renameUsername: reportRename,
				} as unknown as ICommentReportRepository,
				discussion: {
					anonymizeByUsername: discussionRename,
				} as unknown as IDiscussionRepository,
				discussionAnswer: {
					anonymizeByUser: answerRename,
				} as unknown as IDiscussionAnswerRepository,
				notification: {
					renameUsername: notifRename,
					deleteForUser: notifPurge,
				} as unknown as INotificationRepository,
				pushSubscription: {
					renameUsername: pushRename,
					deleteAllByUsername: pushPurge,
				} as unknown as IPushSubscriptionRepository,
				readingReminder: {
					renameUsername: reminderRename,
					deleteByUsername: reminderPurge,
				} as unknown as IReadingReminderPreferenceRepository,
			}),
			order,
			beginRename,
			commentRename,
			moderatorRefsRename,
			reportRename,
			discussionRename,
			answerRename,
			notifRename,
			notifPurge,
			pushRename,
			pushPurge,
			reminderRename,
			reminderPurge,
			disabledByRename,
			clearRenameFrom,
		};
	}

	it("renames the user and cascades to every username-keyed record", async () => {
		const h = setup();

		const result = await h.useCase.execute("alice@example.com", "alice-2");

		// Compare-and-set claim that keeps the old slug held (renameFrom).
		expect(h.beginRename).toHaveBeenCalledWith("u1", "alice", "alice-2");
		expect(h.commentRename).toHaveBeenCalledWith("alice", "alice-2");
		expect(h.moderatorRefsRename).toHaveBeenCalledWith("alice", "alice-2");
		expect(h.reportRename).toHaveBeenCalledWith("alice", "alice-2");
		expect(h.discussionRename).toHaveBeenCalledWith("alice", "alice-2");
		expect(h.answerRename).toHaveBeenCalledWith("u1", "alice-2");
		expect(h.notifRename).toHaveBeenCalledWith("alice", "alice-2");
		// Devices and reminders are keyed by username: without these the user
		// goes silent, and the next owner of "alice" would get them.
		expect(h.pushRename).toHaveBeenCalledWith("alice", "alice-2");
		expect(h.reminderRename).toHaveBeenCalledWith("alice", "alice-2");
		expect(h.disabledByRename).toHaveBeenCalledWith("alice", "alice-2");
		expect(h.clearRenameFrom).toHaveBeenCalledWith("u1");
		expect(result.username).toBe("alice-2");
		expect(result.renameFrom).toBeUndefined();
	});

	it("purges stale records under the new slug before claiming it, never after", async () => {
		const h = setup();

		await h.useCase.execute("alice@example.com", "alice-2");

		expect(h.pushPurge).toHaveBeenCalledWith("alice-2");
		expect(h.reminderPurge).toHaveBeenCalledWith("alice-2");
		expect(h.notifPurge).toHaveBeenCalledWith("alice-2");
		const claim = h.order.indexOf("beginRename");
		for (const purge of [
			"pushSubscription.deleteAllByUsername",
			"readingReminder.deleteByUsername",
			"notification.deleteForUser",
		]) {
			expect(h.order.indexOf(purge)).toBeLessThan(claim);
		}
		expect(h.order[h.order.length - 1]).toBe("clearRenameFrom");
	});

	it("releases the old slug only after the cascade succeeded", async () => {
		const h = setup();
		h.notifRename.mockRejectedValueOnce(new Error("Atlas timeout"));

		await expect(h.useCase.execute("alice@example.com", "alice-2")).rejects.toThrow(
			"Atlas timeout",
		);
		expect(h.clearRenameFrom).not.toHaveBeenCalled();
	});

	it("a retry with the same target finishes the pending cascade without purging the user's own rows", async () => {
		const h = setup({ user: fakeUser({ username: "alice-2", renameFrom: "alice" }) });

		const result = await h.useCase.execute("alice@example.com", "alice-2");

		expect(h.beginRename).not.toHaveBeenCalled();
		expect(h.commentRename).toHaveBeenCalledWith("alice", "alice-2");
		expect(h.pushRename).toHaveBeenCalledWith("alice", "alice-2");
		// "alice-2" is the live slug here: purging it would drop the devices
		// and reminder the first attempt already moved.
		expect(h.pushPurge).not.toHaveBeenCalled();
		expect(h.reminderPurge).not.toHaveBeenCalled();
		expect(h.clearRenameFrom).toHaveBeenCalledWith("u1");
		expect(result.renameFrom).toBeUndefined();
	});

	it("a rename to a new target first finishes the pending one", async () => {
		const h = setup({ user: fakeUser({ username: "alice-2", renameFrom: "alice" }) });

		await h.useCase.execute("alice@example.com", "alice-3");

		expect(h.commentRename).toHaveBeenNthCalledWith(1, "alice", "alice-2");
		expect(h.beginRename).toHaveBeenCalledWith("u1", "alice-2", "alice-3");
		expect(h.commentRename).toHaveBeenNthCalledWith(2, "alice-2", "alice-3");
	});

	it("fails without cascading when another rename changed the account first", async () => {
		const h = setup({ conflict: true });

		await expect(h.useCase.execute("alice@example.com", "alice-2")).rejects.toThrow(
			"Rename conflict",
		);
		expect(h.commentRename).not.toHaveBeenCalled();
		expect(h.clearRenameFrom).not.toHaveBeenCalled();
	});

	it("refuses an account that is being deleted", async () => {
		const h = setup({
			user: fakeUser({
				deletion: { requestedAt: new Date(), communityIds: [], discussionIds: [] },
			}),
		});

		await expect(h.useCase.execute("alice@example.com", "alice-2")).rejects.toThrow(
			"User not found",
		);
		expect(h.beginRename).not.toHaveBeenCalled();
	});

	it("rejects an invalid slug format", async () => {
		const h = setup();

		await expect(
			h.useCase.execute("alice@example.com", "Has Space"),
		).rejects.toThrow("Invalid username format");
		expect(h.beginRename).not.toHaveBeenCalled();
	});

	it("rejects when the new slug is already taken", async () => {
		const h = setup({ takenSlug: "bob" });

		await expect(h.useCase.execute("alice@example.com", "bob")).rejects.toThrow(
			"Username already taken",
		);
		expect(h.beginRename).not.toHaveBeenCalled();
		expect(h.pushPurge).not.toHaveBeenCalled();
	});

	it("is a noop when the slug is unchanged", async () => {
		const h = setup();

		const result = await h.useCase.execute("alice@example.com", "alice");

		expect(h.beginRename).not.toHaveBeenCalled();
		expect(h.commentRename).not.toHaveBeenCalled();
		expect(result.username).toBe("alice");
	});

	it("throws when the user doesn't exist", async () => {
		const h = setup({ user: null });

		await expect(h.useCase.execute("ghost@example.com", "valid")).rejects.toThrow(
			"User not found",
		);
	});
});
