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
  MAX_COMMUNITIES_PER_USER,
} from "./CommunityUseCases";
import type { ICommunityRepository } from "@/domain/repositories/ICommunityRepository";
import type { ICommunityMembershipRepository } from "@/domain/repositories/ICommunityMembershipRepository";
import type { ICommunityFollowRepository } from "@/domain/repositories/ICommunityFollowRepository";
import type { IUserRepository } from "@/domain/repositories/IUserRepository";
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
      return [...rows.entries()]
        .filter(([k]) => k.startsWith(`${userId}::`))
        // Newest follow first — sort by followedAt desc to mirror Mongo.
        .sort((a, b) => b[1].getTime() - a[1].getTime())
        .map(([k]) => k.split("::")[1]);
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
    async countByCommunity(communityId) {
      return [...rows.keys()].filter((k) => k.endsWith(`::${communityId}`)).length;
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
        .filter(([k, v]) => k.endsWith(`::${communityId}`) && v.status === status)
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
    async countApproved(communityId) {
      return [...rows.entries()].filter(
        ([k, v]) => k.endsWith(`::${communityId}`) && v.status === "approved",
      ).length;
    },
    async approvedUserIds(communityId) {
      return [...rows.entries()]
        .filter(([k, v]) => k.endsWith(`::${communityId}`) && v.status === "approved")
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
      return !!r && r.role === "moderator" && r.status === "approved";
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
    expect(await membershipRepo.listByStatus(communityId, "pending")).toHaveLength(
      1,
    );
  });

  it("RequestJoin throws on unknown community", async () => {
    const uc = new RequestJoinCommunityUseCase(communityRepo, membershipRepo);
    await expect(
      uc.execute({ slug: "ghost", userId: "u1" }),
    ).rejects.toThrow(/não encontrada/i);
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
    expect(await membershipRepo.listByStatus(communityId, "pending")).toHaveLength(
      0,
    );
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
