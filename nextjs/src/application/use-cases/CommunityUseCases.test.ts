import { describe, it, expect, beforeEach } from "vitest";
import {
  CreateCommunityUseCase,
  JoinCommunityUseCase,
  LeaveCommunityUseCase,
  MAX_COMMUNITIES_PER_USER,
} from "./CommunityUseCases";
import type { ICommunityRepository } from "@/domain/repositories/ICommunityRepository";
import type { ICommunityMembershipRepository } from "@/domain/repositories/ICommunityMembershipRepository";
import type { IUserRepository } from "@/domain/repositories/IUserRepository";
import type { Community } from "@/domain/entities/Community";
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
      return Array.from(items.values()).filter((c) => c.createdBy === userId).length;
    },
    async findManyByIds(ids) {
      return ids.map((id) => items.get(id)).filter((x): x is Community => !!x);
    },
    async incrementMemberCount(id, delta) {
      const c = items.get(id);
      if (c) c.memberCount += delta;
    },
  };
}

function makeMembershipRepo(): ICommunityMembershipRepository & {
  _rows: Set<string>;
} {
  const rows = new Set<string>();
  const key = (u: string, c: string) => `${u}::${c}`;
  return {
    _rows: rows,
    async join(userId, communityId) {
      const k = key(userId, communityId);
      if (rows.has(k)) return false;
      rows.add(k);
      return true;
    },
    async leave(userId, communityId) {
      return rows.delete(key(userId, communityId));
    },
    async isMember(userId, communityId) {
      return rows.has(key(userId, communityId));
    },
    async listCommunityIdsForUser(userId) {
      return Array.from(rows)
        .filter((k) => k.startsWith(`${userId}::`))
        .map((k) => k.split("::")[1]);
    },
    async listMemberIds(communityId, page, pageSize) {
      const all = Array.from(rows)
        .filter((k) => k.endsWith(`::${communityId}`))
        .map((k) => k.split("::")[0]);
      const start = (page - 1) * pageSize;
      return { items: all.slice(start, start + pageSize), total: all.length };
    },
    async listForUser() {
      return [];
    },
  };
}

describe("CreateCommunityUseCase", () => {
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

describe("JoinCommunityUseCase + LeaveCommunityUseCase", () => {
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

  let communityRepo: ReturnType<typeof makeCommunityRepo>;
  let membershipRepo: ReturnType<typeof makeMembershipRepo>;
  let userRepo: IUserRepository;
  let join: JoinCommunityUseCase;
  let leave: LeaveCommunityUseCase;

  beforeEach(async () => {
    communityRepo = makeCommunityRepo();
    membershipRepo = makeMembershipRepo();
    userRepo = makeUserRepo({ "alice@example.com": alice });
    join = new JoinCommunityUseCase(communityRepo, membershipRepo, userRepo);
    leave = new LeaveCommunityUseCase(communityRepo, membershipRepo, userRepo);
    await communityRepo.create({
      slug: "reformados",
      name: "Reformados",
      description: "",
      createdBy: "u-other",
    });
  });

  it("joins and bumps memberCount on first join only", async () => {
    const r1 = await join.execute("alice@example.com", "reformados");
    expect(r1.joined).toBe(true);
    const c1 = await communityRepo.findBySlug("reformados");
    expect(c1?.memberCount).toBe(1);

    const r2 = await join.execute("alice@example.com", "reformados");
    expect(r2.joined).toBe(false);
    const c2 = await communityRepo.findBySlug("reformados");
    expect(c2?.memberCount).toBe(1);
  });

  it("leaves and decrements only when a row was removed", async () => {
    await join.execute("alice@example.com", "reformados");
    const r1 = await leave.execute("alice@example.com", "reformados");
    expect(r1.left).toBe(true);
    const c1 = await communityRepo.findBySlug("reformados");
    expect(c1?.memberCount).toBe(0);

    // Idempotent leave: no row to remove, no decrement.
    const r2 = await leave.execute("alice@example.com", "reformados");
    expect(r2.left).toBe(false);
    const c2 = await communityRepo.findBySlug("reformados");
    expect(c2?.memberCount).toBe(0);
  });

  it("rejects unknown community", async () => {
    await expect(join.execute("alice@example.com", "ghost")).rejects.toThrow(
      /community/i,
    );
  });
});
