import { describe, it, expect, beforeEach } from "vitest";
import {
	CreateCommunityUseCase,
	RequestJoinCommunityUseCase,
	ListJoinRequestsUseCase,
	ApproveMemberUseCase,
	RejectMemberUseCase,
	SetModeratorUseCase,
	FollowCommunityUseCase,
	UnfollowCommunityUseCase,
	MyFollowedCommunitiesUseCase,
	MyFollowStatusUseCase,
	ListCommunityMembersUseCase,
	ListCommunityFollowersUseCase,
	DeleteCommunityUseCase,
	MAX_COMMUNITIES_PER_USER,
} from "./CommunityUseCases";
import type { ICommunityRepository } from "@/domain/repositories/ICommunityRepository";
import type { ICommunityMembershipRepository } from "@/domain/repositories/ICommunityMembershipRepository";
import type { ICommunityFollowRepository } from "@/domain/repositories/ICommunityFollowRepository";
import type { INotificationRepository } from "@/domain/repositories/INotificationRepository";
import type { IUserRepository } from "@/domain/repositories/IUserRepository";
import type { Notification } from "@/domain/entities/Notification";
import type { Community } from "@/domain/entities/Community";
import type { CommunityMembership } from "@/domain/entities/CommunityMembership";
import type { CommunityFollow } from "@/domain/entities/CommunityFollow";
import type { User } from "@/domain/entities/User";

function makeUserRepo(users: Record<string, User>): IUserRepository {
	return {
		findByEmail: async (email) => users[email] ?? null,
		findByUsername: async (u) =>
			Object.values(users).find((x) => x.username === u) ?? null,
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
		delete: async () => {},
	};
}

function makeCommunityRepo(): ICommunityRepository & {
	_items: Map<string, Community>;
} {
	const items = new Map<string, Community>();
	let nextId = 1;
	return {
		_items: items,
		async create(input) {
			const c: Community = {
				_id: `c-${nextId++}`,
				slug: input.slug,
				name: input.name,
				description: input.description,
				createdBy: input.createdBy,
				memberCount: 0,
				followerCount: 0,
				createdAt: new Date(),
			};
			items.set(c._id!, c);
			return c;
		},
		async findById(id) {
			return items.get(id) ?? null;
		},
		async findBySlug(slug) {
			return Array.from(items.values()).find((c) => c.slug === slug) ?? null;
		},
		async list() {
			return { items: Array.from(items.values()), total: items.size };
		},
		async countCreatedBy(userId) {
			return Array.from(items.values()).filter((c) => c.createdBy === userId)
				.length;
		},
		async findManyByIds(ids) {
			return ids.map((id) => items.get(id)).filter((x): x is Community => !!x);
		},
		async incrementMemberCount(id, delta) {
			const c = items.get(id);
			if (c) c.memberCount += delta;
		},
		async incrementFollowerCount(id, delta) {
			const c = items.get(id);
			if (c) c.followerCount += delta;
		},
		// Fake repo must match the async interface signature even though
		// the in-memory Map ops are sync — skip DeepSource JS-0116 here.
		// skipcq: JS-0116
		async deleteById(id) {
			return items.delete(id);
		},
	};
}

function makeFollowRepo(): ICommunityFollowRepository & {
	_rows: Map<string, Date>;
} {
	const rows = new Map<string, Date>();
	const key = (u: string, c: string) => `${u}::${c}`;
	return {
		_rows: rows,
		async follow(userId, communityId) {
			const k = key(userId, communityId);
			if (rows.has(k)) return false;
			rows.set(k, new Date());
			return true;
		},
		async unfollow(userId, communityId) {
			return rows.delete(key(userId, communityId));
		},
		async isFollowing(userId, communityId) {
			return rows.has(key(userId, communityId));
		},
		async followedCommunityIds(userId) {
			return (
				[...rows.entries()]
					.filter(([k]) => k.startsWith(`${userId}::`))
					// Newest follow first — sort by followedAt desc to mirror Mongo.
					.sort((a, b) => b[1].getTime() - a[1].getTime())
					.map(([k]) => k.split("::")[1])
			);
		},
		async listForUser(userId) {
			return [...rows.entries()]
				.filter(([k]) => k.startsWith(`${userId}::`))
				.map(
					([k, t]): CommunityFollow => ({
						userId: k.split("::")[0],
						communityId: k.split("::")[1],
						followedAt: t,
					}),
				);
		},
		async listByCommunity(communityId) {
			return [...rows.entries()]
				.filter(([k]) => k.endsWith(`::${communityId}`))
				.sort((a, b) => b[1].getTime() - a[1].getTime())
				.map(
					([k, t]): CommunityFollow => ({
						userId: k.split("::")[0],
						communityId: k.split("::")[1],
						followedAt: t,
					}),
				);
		},
		async countByCommunity(communityId) {
			return [...rows.keys()].filter((k) => k.endsWith(`::${communityId}`))
				.length;
		},
		async removeAllByUser(userId) {
			const prev = rows.size;
			[...rows.keys()]
				.filter((k) => k.startsWith(`${userId}::`))
				.forEach((k) => rows.delete(k));
			return prev - rows.size;
		},
		async removeAllByCommunity(communityId) {
			const prev = rows.size;
			[...rows.keys()]
				.filter((k) => k.endsWith(`::${communityId}`))
				.forEach((k) => rows.delete(k));
			return prev - rows.size;
		},
	};
}

type Row = { status: "pending" | "approved"; role: "member" | "moderator" };

function makeMembershipRepo(): ICommunityMembershipRepository & {
	_rows: Map<string, Row>;
} {
	const rows = new Map<string, Row>();
	const key = (u: string, c: string) => `${u}::${c}`;
	const split = (k: string) => k.split("::");
	return {
		_rows: rows,
		async join(userId, communityId) {
			const k = key(userId, communityId);
			if (rows.has(k)) return false;
			rows.set(k, { status: "approved", role: "member" });
			return true;
		},
		async leave(userId, communityId) {
			return rows.delete(key(userId, communityId));
		},
		async isMember(userId, communityId) {
			return rows.has(key(userId, communityId));
		},
		async listCommunityIdsForUser(userId) {
			return [...rows.keys()]
				.filter((k) => k.startsWith(`${userId}::`))
				.map((k) => split(k)[1]);
		},
		async listMemberIds(communityId, page, pageSize) {
			const all = [...rows.keys()]
				.filter((k) => k.endsWith(`::${communityId}`))
				.map((k) => split(k)[0]);
			const start = (page - 1) * pageSize;
			return { items: all.slice(start, start + pageSize), total: all.length };
		},
		async listForUser(userId) {
			return [...rows.entries()]
				.filter(([k]) => k.startsWith(`${userId}::`))
				.map(([k, v]): CommunityMembership => {
					const [u, c] = split(k);
					return { userId: u, communityId: c, ...v };
				});
		},
		async createRequest(userId, communityId) {
			const k = key(userId, communityId);
			if (!rows.has(k)) rows.set(k, { status: "pending", role: "member" });
		},
		async listByStatus(communityId, status) {
			return [...rows.entries()]
				.filter(
					([k, v]) => k.endsWith(`::${communityId}`) && v.status === status,
				)
				.map(([k, v]): CommunityMembership => {
					const [u, c] = split(k);
					return { userId: u, communityId: c, ...v };
				});
		},
		async setStatus(userId, communityId, status) {
			const r = rows.get(key(userId, communityId));
			if (!r || r.status === status) return false;
			r.status = status;
			return true;
		},
		async remove(userId, communityId) {
			return rows.delete(key(userId, communityId));
		},
		async getStatus(userId, communityId) {
			const r = rows.get(key(userId, communityId));
			return r ? r.status : null;
		},
		async findOne(userId, communityId) {
			const r = rows.get(key(userId, communityId));
			if (!r) return null;
			return { userId, communityId, ...r };
		},
		async countApproved(communityId) {
			return [...rows.entries()].filter(
				([k, v]) => k.endsWith(`::${communityId}`) && v.status === "approved",
			).length;
		},
		async approvedUserIds(communityId) {
			return [...rows.entries()]
				.filter(
					([k, v]) => k.endsWith(`::${communityId}`) && v.status === "approved",
				)
				.map(([k]) => split(k)[0]);
		},
		async setRole(userId, communityId, role) {
			const r = rows.get(key(userId, communityId));
			if (!r || r.role === role) return false;
			r.role = role;
			return true;
		},
		async isModerator(userId, communityId) {
			const r = rows.get(key(userId, communityId));
			return Boolean(r) && r?.role === "moderator" && r?.status === "approved";
		},
		// Async signature is interface-mandated — skip JS-0116.
		// skipcq: JS-0116
		async removeAllByCommunity(communityId) {
			const before = rows.size;
			[...rows.keys()]
				.filter((k) => k.endsWith(`::${communityId}`))
				.forEach((k) => rows.delete(k));
			return before - rows.size;
		},
	};
}

const alice: User = {
	_id: "u-alice",
	email: "alice@example.com",
	username: "alice",
	displayName: "Alice",
	password: "hash",
	state: "SP",
	belief: "catholic",
	showBelief: false,
	moderator: false,
	tutorialsCompleted: [],
	badges: [],
};

describe("CreateCommunityUseCase", () => {
	let communityRepo: ReturnType<typeof makeCommunityRepo>;
	let userRepo: IUserRepository;
	let usecase: CreateCommunityUseCase;

	beforeEach(() => {
		communityRepo = makeCommunityRepo();
		userRepo = makeUserRepo({ "alice@example.com": alice });
		usecase = new CreateCommunityUseCase(communityRepo, userRepo);
	});

	it("creates a community owned by the actor", async () => {
		const c = await usecase.execute({
			actorEmail: "alice@example.com",
			slug: "reformados",
			name: "Reformados",
			description: "comunidade reformada",
		});
		expect(c._id).toBeDefined();
		expect(c.slug).toBe("reformados");
		expect(c.createdBy).toBe("u-alice");
		expect(c.memberCount).toBe(0);
	});

	it("rejects invalid slugs", async () => {
		await expect(
			usecase.execute({
				actorEmail: "alice@example.com",
				slug: "X X",
				name: "Bad",
			}),
		).rejects.toThrow(/slug/i);
	});

	it("rejects duplicate slugs", async () => {
		await usecase.execute({
			actorEmail: "alice@example.com",
			slug: "reformados",
			name: "Reformados",
		});
		await expect(
			usecase.execute({
				actorEmail: "alice@example.com",
				slug: "reformados",
				name: "Outro nome",
			}),
		).rejects.toThrow(/in use/i);
	});

	it("enforces the per-user creation cap", async () => {
		for (let i = 0; i < MAX_COMMUNITIES_PER_USER; i++) {
			await usecase.execute({
				actorEmail: "alice@example.com",
				slug: `slug-${i}`,
				name: `Comunidade ${i}`,
			});
		}
		await expect(
			usecase.execute({
				actorEmail: "alice@example.com",
				slug: "one-more",
				name: "One more",
			}),
		).rejects.toThrow(/limit/i);
	});

	it("rejects unknown actor", async () => {
		await expect(
			usecase.execute({
				actorEmail: "ghost@example.com",
				slug: "ghosts",
				name: "Ghosts",
			}),
		).rejects.toThrow(/actor/i);
	});
});

describe("Community moderation use-cases", () => {
	let communityRepo: ReturnType<typeof makeCommunityRepo>;
	let membershipRepo: ReturnType<typeof makeMembershipRepo>;
	let communityId: string;

	beforeEach(async () => {
		communityRepo = makeCommunityRepo();
		membershipRepo = makeMembershipRepo();
		const c = await communityRepo.create({
			slug: "alpha",
			name: "Alpha",
			description: "",
			createdBy: "creator",
		});
		communityId = c._id!;
	});

	it("RequestJoinCommunityUseCase creates a pending membership", async () => {
		const uc = new RequestJoinCommunityUseCase(communityRepo, membershipRepo);
		await uc.execute({ slug: "alpha", userId: "u1" });
		expect(
			await membershipRepo.listByStatus(communityId, "pending"),
		).toHaveLength(1);
	});

	it("RequestJoin throws on unknown community", async () => {
		const uc = new RequestJoinCommunityUseCase(communityRepo, membershipRepo);
		await expect(uc.execute({ slug: "ghost", userId: "u1" })).rejects.toThrow(
			/não encontrada/i,
		);
	});

	it("ApproveMemberUseCase rejects when actor is not a moderator", async () => {
		const uc = new ApproveMemberUseCase(communityRepo, membershipRepo);
		await expect(
			uc.execute({ slug: "alpha", actorId: "stranger", targetUserId: "u1" }),
		).rejects.toThrow(/moderador/i);
	});

	it("ApproveMember approves and bumps memberCount when actor is moderator", async () => {
		await membershipRepo.createRequest("u1", communityId);
		await membershipRepo.createRequest("mod", communityId);
		await membershipRepo.setStatus("mod", communityId, "approved");
		await membershipRepo.setRole("mod", communityId, "moderator");

		const uc = new ApproveMemberUseCase(communityRepo, membershipRepo);
		await uc.execute({ slug: "alpha", actorId: "mod", targetUserId: "u1" });

		expect(await membershipRepo.approvedUserIds(communityId)).toContain("u1");
		expect((await communityRepo.findBySlug("alpha"))?.memberCount).toBe(1);
	});

	it("ListJoinRequestsUseCase: moderator sees pending, stranger is rejected", async () => {
		await membershipRepo.createRequest("u1", communityId);
		await membershipRepo.createRequest("mod", communityId);
		await membershipRepo.setStatus("mod", communityId, "approved");
		await membershipRepo.setRole("mod", communityId, "moderator");

		const uc = new ListJoinRequestsUseCase(communityRepo, membershipRepo);
		const pending = await uc.execute({ slug: "alpha", actorId: "mod" });
		expect(pending.map((m) => m.userId)).toContain("u1");
		await expect(
			uc.execute({ slug: "alpha", actorId: "stranger" }),
		).rejects.toThrow(/moderador/i);
	});

	it("RejectMemberUseCase removes the membership", async () => {
		await membershipRepo.createRequest("u1", communityId);
		await membershipRepo.createRequest("mod", communityId);
		await membershipRepo.setStatus("mod", communityId, "approved");
		await membershipRepo.setRole("mod", communityId, "moderator");

		const uc = new RejectMemberUseCase(communityRepo, membershipRepo);
		await uc.execute({ slug: "alpha", actorId: "mod", targetUserId: "u1" });
		expect(
			await membershipRepo.listByStatus(communityId, "pending"),
		).toHaveLength(0);
	});

	it("SetModeratorUseCase: only the creator can promote", async () => {
		await membershipRepo.createRequest("u1", communityId);
		await membershipRepo.setStatus("u1", communityId, "approved");

		const uc = new SetModeratorUseCase(communityRepo, membershipRepo);
		await expect(
			uc.execute({
				slug: "alpha",
				actorId: "not-creator",
				targetUserId: "u1",
				makeModerator: true,
			}),
		).rejects.toThrow(/criador/i);

		await uc.execute({
			slug: "alpha",
			actorId: "creator",
			targetUserId: "u1",
			makeModerator: true,
		});
		expect(await membershipRepo.isModerator("u1", communityId)).toBe(true);
	});
});

describe("Community follow use-cases (plan_community follow-up)", () => {
	let communityRepo: ReturnType<typeof makeCommunityRepo>;
	let membershipRepo: ReturnType<typeof makeMembershipRepo>;
	let followRepo: ReturnType<typeof makeFollowRepo>;
	let communityId: string;

	beforeEach(async () => {
		communityRepo = makeCommunityRepo();
		membershipRepo = makeMembershipRepo();
		followRepo = makeFollowRepo();
		const c = await communityRepo.create({
			slug: "alpha",
			name: "Alpha",
			description: "",
			createdBy: "creator",
		});
		communityId = c._id!;
	});

	it("FollowCommunityUseCase increments followerCount on first follow only", async () => {
		const uc = new FollowCommunityUseCase(communityRepo, followRepo);
		const first = await uc.execute({ slug: "alpha", userId: "u1" });
		expect(first.alreadyFollowed).toBe(false);
		expect((await communityRepo.findBySlug("alpha"))?.followerCount).toBe(1);

		// Idempotent — second tap doesn't double-count.
		const second = await uc.execute({ slug: "alpha", userId: "u1" });
		expect(second.alreadyFollowed).toBe(true);
		expect((await communityRepo.findBySlug("alpha"))?.followerCount).toBe(1);
	});

	it("UnfollowCommunityUseCase only decrements when a row was actually removed", async () => {
		const f = new FollowCommunityUseCase(communityRepo, followRepo);
		const u = new UnfollowCommunityUseCase(communityRepo, followRepo);
		await f.execute({ slug: "alpha", userId: "u1" });
		expect((await communityRepo.findBySlug("alpha"))?.followerCount).toBe(1);

		const ok = await u.execute({ slug: "alpha", userId: "u1" });
		expect(ok.didRemove).toBe(true);
		expect((await communityRepo.findBySlug("alpha"))?.followerCount).toBe(0);

		// Unfollowing again is a no-op (doesn't go negative).
		const noop = await u.execute({ slug: "alpha", userId: "u1" });
		expect(noop.didRemove).toBe(false);
		expect((await communityRepo.findBySlug("alpha"))?.followerCount).toBe(0);
	});

	it("MyFollowedCommunitiesUseCase preserves newest-follow-first order", async () => {
		await communityRepo.create({
			slug: "beta",
			name: "Beta",
			description: "",
			createdBy: "creator",
		});
		const f = new FollowCommunityUseCase(communityRepo, followRepo);
		await f.execute({ slug: "alpha", userId: "u1" });
		// Bump timestamp so beta is strictly newer.
		await new Promise((r) => setTimeout(r, 5));
		await f.execute({ slug: "beta", userId: "u1" });

		const uc = new MyFollowedCommunitiesUseCase(communityRepo, followRepo);
		const list = await uc.execute("u1");
		expect(list.map((c) => c.slug)).toEqual(["beta", "alpha"]);
	});

	it("MyFollowStatusUseCase returns following:false for unknown community", async () => {
		const uc = new MyFollowStatusUseCase(communityRepo, followRepo);
		expect(await uc.execute({ slug: "ghost", userId: "u1" })).toEqual({
			following: false,
		});
	});

	it("ApproveMember auto-follows the approved member when follow repo is wired", async () => {
		await membershipRepo.createRequest("u1", communityId);
		await membershipRepo.createRequest("mod", communityId);
		await membershipRepo.setStatus("mod", communityId, "approved");
		await membershipRepo.setRole("mod", communityId, "moderator");

		const uc = new ApproveMemberUseCase(
			communityRepo,
			membershipRepo,
			followRepo,
		);
		await uc.execute({ slug: "alpha", actorId: "mod", targetUserId: "u1" });

		expect(await followRepo.isFollowing("u1", communityId)).toBe(true);
		expect((await communityRepo.findBySlug("alpha"))?.followerCount).toBe(1);
		// memberCount also bumped (existing behavior preserved).
		expect((await communityRepo.findBySlug("alpha"))?.memberCount).toBe(1);
	});

	it("ApproveMember without follow repo still works (back-compat)", async () => {
		await membershipRepo.createRequest("u1", communityId);
		await membershipRepo.createRequest("mod", communityId);
		await membershipRepo.setStatus("mod", communityId, "approved");
		await membershipRepo.setRole("mod", communityId, "moderator");

		// No follow repo — only the membership/memberCount side runs.
		const uc = new ApproveMemberUseCase(communityRepo, membershipRepo);
		await uc.execute({ slug: "alpha", actorId: "mod", targetUserId: "u1" });

		expect((await communityRepo.findBySlug("alpha"))?.memberCount).toBe(1);
		expect((await communityRepo.findBySlug("alpha"))?.followerCount).toBe(0);
	});
});

describe("ListCommunityMembersUseCase", () => {
	it("sorts creator → moderators (alphabetical) → members (alphabetical)", async () => {
		const communityRepo = makeCommunityRepo();
		const membershipRepo = makeMembershipRepo();
		const c = await communityRepo.create({
			slug: "alpha",
			name: "Alpha",
			description: "",
			createdBy: "u-alice",
		});
		// alice is the creator; carol is moderator; bob + dave are plain members.
		const userRepo: IUserRepository = {
			findByEmail: async () => null,
			findByUsername: async () => null,
			findByUsernamePublic: async () => null,
			searchByUsernamePrefix: async () => [],
			findByUsernames: async () => [],
			findManyByIds: async (ids) =>
				ids.map(
					(id) =>
						({
							_id: id,
							email: `${id}@x`,
							username:
								{
									"u-alice": "alice",
									"u-bob": "bob",
									"u-carol": "carol",
									"u-dave": "dave",
								}[id] ?? id,
							password: "",
							state: "",
							belief: "",
							showBelief: false,
							moderator: false,
							tutorialsCompleted: [],
							badges: [],
						}) as User,
				),
			findAll: async () => [],
			findAllPaginated: async () => [],
		findForModeration: async () => ({ items: [], nextCursor: null }),
			create: async () => ({}) as User,
			updatePassword: async () => {},
			updatePasswordById: async () => {},
			update: async () => null,
			markTutorialCompleted: async () => {},
			addBadges: async () => [],
			delete: async () => {},
		};
		await membershipRepo.createRequest("u-alice", c._id!);
		await membershipRepo.setStatus("u-alice", c._id!, "approved");
		await membershipRepo.setRole("u-alice", c._id!, "moderator");
		await membershipRepo.createRequest("u-bob", c._id!);
		await membershipRepo.setStatus("u-bob", c._id!, "approved");
		await membershipRepo.createRequest("u-carol", c._id!);
		await membershipRepo.setStatus("u-carol", c._id!, "approved");
		await membershipRepo.setRole("u-carol", c._id!, "moderator");
		await membershipRepo.createRequest("u-dave", c._id!);
		await membershipRepo.setStatus("u-dave", c._id!, "approved");

		const list = await new ListCommunityMembersUseCase(
			communityRepo,
			membershipRepo,
			userRepo,
		).execute("alpha");

		expect(list.map((m) => m.username)).toEqual([
			"alice",
			"carol",
			"bob",
			"dave",
		]);
		expect(list[0].isCreator).toBe(true);
		expect(list[1].role).toBe("moderator");
		expect(list[2].role).toBe("member");
	});

	it("returns empty for unknown slug", async () => {
		const communityRepo = makeCommunityRepo();
		const membershipRepo = makeMembershipRepo();
		const userRepo = makeUserRepo({});
		const list = await new ListCommunityMembersUseCase(
			communityRepo,
			membershipRepo,
			userRepo,
		).execute("ghost");
		expect(list).toEqual([]);
	});
});

describe("ListCommunityFollowersUseCase", () => {
	it("returns follower userIds enriched with username, newest follow first", async () => {
		const communityRepo = makeCommunityRepo();
		const followRepo = makeFollowRepo();
		const userRepo: IUserRepository = {
			findByEmail: async () => null,
			findByUsername: async () => null,
			findByUsernamePublic: async () => null,
			searchByUsernamePrefix: async () => [],
			findByUsernames: async () => [],
			findManyByIds: async (ids) =>
				ids.map(
					(id) =>
						({
							_id: id,
							email: `${id}@x`,
							username: { "u-alice": "alice", "u-bob": "bob" }[id] ?? id,
							password: "",
							state: "",
							belief: "",
							showBelief: false,
							moderator: false,
							tutorialsCompleted: [],
							badges: [],
						}) as User,
				),
			findAll: async () => [],
			findAllPaginated: async () => [],
		findForModeration: async () => ({ items: [], nextCursor: null }),
			create: async () => ({}) as User,
			updatePassword: async () => {},
			updatePasswordById: async () => {},
			update: async () => null,
			markTutorialCompleted: async () => {},
			addBadges: async () => [],
			delete: async () => {},
		};
		const c = await communityRepo.create({
			slug: "alpha",
			name: "Alpha",
			description: "",
			createdBy: "u-alice",
		});
		await followRepo.follow("u-alice", c._id!);
		await new Promise((r) => setTimeout(r, 5));
		await followRepo.follow("u-bob", c._id!);

		const list = await new ListCommunityFollowersUseCase(
			communityRepo,
			followRepo,
			userRepo,
		).execute("alpha");
		expect(list.map((p) => p.username)).toEqual(["bob", "alice"]);
	});

	it("returns empty for unknown slug", async () => {
		const out = await new ListCommunityFollowersUseCase(
			makeCommunityRepo(),
			makeFollowRepo(),
			makeUserRepo({}),
		).execute("ghost");
		expect(out).toEqual([]);
	});
});

function makeNotificationsRepo(): INotificationRepository & {
	_rows: Notification[];
} {
	const rows: Notification[] = [];
	return {
		_rows: rows,
		async create(n) {
			const doc: Notification = {
				...n,
				read: false,
				_id: `n-${rows.length + 1}`,
			};
			rows.push(doc);
			return doc;
		},
		async createMany(many) {
			for (const n of many) {
				rows.push({ ...n, read: false, _id: `n-${rows.length + 1}` });
			}
			return many.length;
		},
		async findByRecipient() {
			return [];
		},
		async countUnread() {
			return 0;
		},
		async markAsRead() {
			return null;
		},
		async markAllAsRead() {
			return 0;
		},
		async deleteForUser() {
			return 0;
		},
		async userHasMentioned() {
			return false;
		},
		async existsFor() {
			return false;
		},
		async renameUsername() {
			return 0;
		},
	};
}

function makeUserRepoWithIds(byId: Record<string, string>): IUserRepository {
	return {
		findByEmail: async () => null,
		findByUsername: async () => null,
		findByUsernamePublic: async () => null,
		searchByUsernamePrefix: async () => [],
		findByUsernames: async () => [],
		findManyByIds: async (ids) =>
			ids
				.filter((id) => byId[id])
				.map(
					(id) =>
						({
							_id: id,
							email: `${id}@x`,
							username: byId[id],
							password: "",
							state: "",
							belief: "",
							showBelief: false,
							moderator: false,
							tutorialsCompleted: [],
							badges: [],
						}) as User,
				),
		findAll: async () => [],
		findAllPaginated: async () => [],
		findForModeration: async () => ({ items: [], nextCursor: null }),
		create: async () => ({}) as User,
		updatePassword: async () => {},
		updatePasswordById: async () => {},
		update: async () => null,
		markTutorialCompleted: async () => {},
		addBadges: async () => [],
		delete: async () => {},
	};
}

describe("Community notifications (plan_community follow-up)", () => {
	let communityRepo: ReturnType<typeof makeCommunityRepo>;
	let membershipRepo: ReturnType<typeof makeMembershipRepo>;
	let followRepo: ReturnType<typeof makeFollowRepo>;
	let notificationsRepo: ReturnType<typeof makeNotificationsRepo>;
	let userRepo: IUserRepository;
	let communityId: string;

	beforeEach(async () => {
		communityRepo = makeCommunityRepo();
		membershipRepo = makeMembershipRepo();
		followRepo = makeFollowRepo();
		notificationsRepo = makeNotificationsRepo();
		userRepo = makeUserRepoWithIds({
			"u-alice": "alice",
			"u-bob": "bob",
			"u-carol": "carol",
		});
		const c = await communityRepo.create({
			slug: "alpha",
			name: "Alpha",
			description: "",
			createdBy: "u-alice", // alice is creator
		});
		communityId = c._id!;
		// Alice is also an approved moderator (post-migration invariant).
		await membershipRepo.createRequest("u-alice", communityId);
		await membershipRepo.setStatus("u-alice", communityId, "approved");
		await membershipRepo.setRole("u-alice", communityId, "moderator");
	});

	it("RequestJoin notifies all moderators (and creator) but not the requester", async () => {
		// Add carol as a second moderator so we exercise the multi-recipient path.
		await membershipRepo.createRequest("u-carol", communityId);
		await membershipRepo.setStatus("u-carol", communityId, "approved");
		await membershipRepo.setRole("u-carol", communityId, "moderator");

		const uc = new RequestJoinCommunityUseCase(
			communityRepo,
			membershipRepo,
			userRepo,
			notificationsRepo,
		);
		await uc.execute({ slug: "alpha", userId: "u-bob" });

		const sent = notificationsRepo._rows;
		expect(sent).toHaveLength(2);
		expect(sent.every((n) => n.type === "community_join_requested")).toBe(true);
		expect(sent.map((n) => n.recipient).sort()).toEqual(["alice", "carol"]);
		expect(sent.every((n) => n.actor === "bob")).toBe(true);
	});

	it("ApproveMember notifies the approved user only on first approval", async () => {
		await membershipRepo.createRequest("u-bob", communityId);

		const uc = new ApproveMemberUseCase(
			communityRepo,
			membershipRepo,
			followRepo,
			userRepo,
			notificationsRepo,
		);
		await uc.execute({
			slug: "alpha",
			actorId: "u-alice",
			targetUserId: "u-bob",
		});

		expect(notificationsRepo._rows).toHaveLength(1);
		const n = notificationsRepo._rows[0];
		expect(n.recipient).toBe("bob");
		expect(n.actor).toBe("alice");
		expect(n.type).toBe("community_join_approved");

		// Re-approving is a no-op upstream → no second notification.
		await uc.execute({
			slug: "alpha",
			actorId: "u-alice",
			targetUserId: "u-bob",
		});
		expect(notificationsRepo._rows).toHaveLength(1);
	});

	it("SetModerator notifies on promote, silent on demote", async () => {
		await membershipRepo.createRequest("u-bob", communityId);
		await membershipRepo.setStatus("u-bob", communityId, "approved");

		const uc = new SetModeratorUseCase(
			communityRepo,
			membershipRepo,
			userRepo,
			notificationsRepo,
		);
		await uc.execute({
			slug: "alpha",
			actorId: "u-alice",
			targetUserId: "u-bob",
			makeModerator: true,
		});
		expect(notificationsRepo._rows).toHaveLength(1);
		expect(notificationsRepo._rows[0].type).toBe("community_role_promoted");

		// Demote → no new notification (silent by design).
		await uc.execute({
			slug: "alpha",
			actorId: "u-alice",
			targetUserId: "u-bob",
			makeModerator: false,
		});
		expect(notificationsRepo._rows).toHaveLength(1);
	});
});

describe("DeleteCommunityUseCase", () => {
	let communityRepo: ReturnType<typeof makeCommunityRepo>;
	let membershipRepo: ReturnType<typeof makeMembershipRepo>;
	let followRepo: ReturnType<typeof makeFollowRepo>;
	let communityId: string;

	beforeEach(async () => {
		communityRepo = makeCommunityRepo();
		membershipRepo = makeMembershipRepo();
		followRepo = makeFollowRepo();
		const created = await communityRepo.create({
			slug: "alpha",
			name: "Alpha",
			description: "",
			createdBy: "u-alice",
		});
		communityId = created._id!;
	});

	it("throws when the community does not exist", async () => {
		const uc = new DeleteCommunityUseCase(
			communityRepo,
			membershipRepo,
			followRepo,
		);
		await expect(
			uc.execute({ slug: "ghost", actorId: "u-alice" }),
		).rejects.toThrow(/não encontrada/i);
	});

	it("forbids deletion by non-creators (even moderators)", async () => {
		// Promote bob to moderator.
		await membershipRepo.createRequest("u-bob", communityId);
		await membershipRepo.setStatus("u-bob", communityId, "approved");
		await membershipRepo.setRole("u-bob", communityId, "moderator");

		const uc = new DeleteCommunityUseCase(
			communityRepo,
			membershipRepo,
			followRepo,
		);
		await expect(
			uc.execute({ slug: "alpha", actorId: "u-bob" }),
		).rejects.toThrow(/criador/i);

		// Community still exists, rows untouched.
		expect(await communityRepo.findBySlug("alpha")).not.toBeNull();
		expect(
			await membershipRepo.listByStatus(communityId, "approved"),
		).toHaveLength(1);
	});

	it("cascades memberships + follows and removes the community", async () => {
		await membershipRepo.createRequest("u-bob", communityId);
		await membershipRepo.setStatus("u-bob", communityId, "approved");
		await membershipRepo.createRequest("u-carol", communityId);
		await followRepo.follow("u-bob", communityId);
		await followRepo.follow("u-dave", communityId);

		const uc = new DeleteCommunityUseCase(
			communityRepo,
			membershipRepo,
			followRepo,
		);
		const result = await uc.execute({
			slug: "alpha",
			actorId: "u-alice",
		});

		expect(result.removedMemberships).toBe(2);
		expect(result.removedFollows).toBe(2);
		expect(await communityRepo.findBySlug("alpha")).toBeNull();
		expect(
			await membershipRepo.listByStatus(communityId, "approved"),
		).toHaveLength(0);
		expect(await followRepo.countByCommunity(communityId)).toBe(0);
	});
});
