import { describe, it, expect, vi } from "vitest";
import {
  BackupUsersUseCase,
  RestoreUsersUseCase,
  ImportCommentsUseCase,
  ImportDiscussionsUseCase,
  BackupErasuresUseCase,
  RestoreErasuresUseCase,
} from "./BackupUseCases";
import { ANONYMIZED_USERNAME } from "./UserUseCases";
import type { IUserRepository } from "@/domain/repositories/IUserRepository";
import type { ICommentRepository } from "@/domain/repositories/ICommentRepository";
import type { IDiscussionRepository } from "@/domain/repositories/IDiscussionRepository";
import type { IAccountErasureRepository } from "@/domain/repositories/IAccountErasureRepository";
import type { User } from "@/domain/entities/User";
import type { Comment } from "@/domain/entities/Comment";
import type { Discussion } from "@/domain/entities/Discussion";
import type {
  BackupCommentItem,
  BackupDiscussionItem,
  BackupUserItem,
} from "@/lib/schemas";

function fakeUser(overrides: Partial<User> = {}): User {
  return {
    _id: "u1",
    email: "alice@example.com",
    username: "alice",
    password: "$2b$12$abcdefghijklmnopqrstuv",
    state: "SP",
    belief: "catholic",
    moderator: false,
    ...overrides,
  };
}

function repoReturning(users: User[]): IUserRepository {
  return {
    findByEmail: async () => null,
    findByUsername: async () => null,
    findById: async () => null,
    findByUsernamePublic: async () => null,
    searchByUsernamePrefix: async () => [],
    findByUsernames: async () => [],
    findManyByIds: async () => [],
    findAll: async () => users,
    findAllPaginated: async () => users,
    findForModeration: async () => ({ items: [], nextCursor: null }),
    create: async (u) => ({ _id: "new", ...u }),
    updatePasswordById: async () => null,
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
    deleteById: async () => false,
    beginDeletion: async () => null,
    replaceDisabledBy: async () => 0,
    findPendingDeletions: async () => [],
    isUsernameHeld: async () => false,
    clearRenameFrom: async () => {},
    beginRename: async () => null,
    findPendingRenames: async () => [],
  };
}

const DELETION = {
  requestedAt: new Date("2026-09-01T00:00:00Z"),
  communityIds: [],
  discussionIds: [],
};

describe("BackupUsersUseCase", () => {
  it("strips password from every user", async () => {
    const users = [
      fakeUser({ username: "alice" }),
      fakeUser({ username: "bob", password: "$2b$12$zzzz" }),
    ];
    const useCase = new BackupUsersUseCase(repoReturning(users));

    const result = await useCase.execute();

    expect(result).toHaveLength(2);
    for (const u of result) {
      expect(u).not.toHaveProperty("password");
    }
    expect(result[0].username).toBe("alice");
    expect(result[1].username).toBe("bob");
  });

  it("preserves all non-credential fields", async () => {
    const useCase = new BackupUsersUseCase(
      repoReturning([fakeUser({ state: "RJ", belief: "atheist", moderator: true })]),
    );

    const [u] = await useCase.execute();

    expect(u.email).toBe("alice@example.com");
    expect(u.username).toBe("alice");
    expect(u.state).toBe("RJ");
    expect(u.belief).toBe("atheist");
    expect(u.moderator).toBe(true);
  });

  it("exports only whitelisted fields, createdAt included", async () => {
    const createdAt = new Date("2025-03-04T05:06:07Z");
    const useCase = new BackupUsersUseCase(
      repoReturning([
        fakeUser({
          _id: "64b000000000000000000001",
          displayName: "Alice",
          showBelief: true,
          badges: ["first-comment"],
          tutorialsCompleted: ["chapter-v1"],
          emailVerifiedAt: new Date("2025-03-05T00:00:00Z"),
          pendingEmail: "new@example.com",
          renameFrom: "alice-old",
          sessionVersion: 3,
          createdAt,
          updatedAt: new Date(),
        }),
      ]),
    );

    const [u] = await useCase.execute();

    expect(Object.keys(u).sort()).toEqual(
      [
        "_id",
        "badges",
        "belief",
        "createdAt",
        "disabledAt",
        "disabledBy",
        "displayName",
        "email",
        "emailVerifiedAt",
        "moderator",
        "showBelief",
        "state",
        "tutorialsCompleted",
        "username",
      ].sort(),
    );
    for (const key of ["password", "deletion", "renameFrom", "pendingEmail", "sessionVersion", "updatedAt"]) {
      expect(u).not.toHaveProperty(key);
    }
    expect(u.createdAt).toBe(createdAt);
    expect(u._id).toBe("64b000000000000000000001");
  });

  it("leaves out accounts whose deletion is in progress", async () => {
    const useCase = new BackupUsersUseCase(
      repoReturning([
        fakeUser({ username: "alice" }),
        fakeUser({ _id: "u2", username: "leaving", email: "l@example.com", deletion: DELETION }),
      ]),
    );

    const result = await useCase.execute();

    expect(result.map((u) => u.username)).toEqual(["alice"]);
  });
});

describe("RestoreUsersUseCase", () => {
  const ALICE_ID = "64b000000000000000000001";
  /** Seconds encoded in ALICE_ID's first 4 bytes. */
  const ALICE_ID_TIME = new Date(parseInt(ALICE_ID.slice(0, 8), 16) * 1000);

  function row(overrides: Partial<BackupUserItem> = {}): BackupUserItem {
    return {
      _id: ALICE_ID,
      email: "alice@example.com",
      username: "alice",
      ...overrides,
    } as BackupUserItem;
  }

  /** In-memory accounts; `create` adds to them like the real repository. */
  function setup(opts: { live?: User[]; erased?: string[] } = {}) {
    const live = [...(opts.live ?? [])];
    const order: string[] = [];
    const sameName = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

    const user = repoReturning(live);
    const create = vi.fn(async (u: Omit<User, "_id"> & { _id?: string }) => {
      order.push(`create:${u.username}`);
      const doc = { _id: `new-${live.length}`, ...u };
      live.push(doc);
      return doc;
    });
    user.create = create;
    user.findByEmailOrPendingEmail = async (email) =>
      live.find((u) => u.email === email || u.pendingEmail === email) ?? null;
    user.findById = async (id) => live.find((u) => u._id === id) ?? null;
    user.findByUsername = async (name) => live.find((u) => sameName(u.username, name)) ?? null;
    user.isUsernameHeld = async (name) =>
      live.some((u) => sameName(u.username, name) || (u.renameFrom !== undefined && sameName(u.renameFrom, name)));

    const findErased = vi.fn(async (ids: string[]) => new Set(ids.filter((id) => opts.erased?.includes(id))));
    const erasures = { findErased } as unknown as IAccountErasureRepository;

    const purge = (what: string) =>
      vi.fn(async (name: string) => {
        order.push(`${what}:${name}`);
        return 0;
      });
    const usernameKeyed = {
      pushSubscription: { deleteAllByUsername: purge("push") },
      readingReminder: { deleteByUsername: purge("reminder") },
      notification: { deleteForUser: purge("notifications") },
    };
    const placeholderHash = vi.fn(async () => "$2b$12$placeholder");

    const useCase = new RestoreUsersUseCase({
      user,
      erasures,
      usernameKeyed: usernameKeyed as never,
      placeholderHash,
    });
    return { useCase, create, findErased, placeholderHash, order, live };
  }

  it("re-creates a valid row under its original id and createdAt, as a non-moderator", async () => {
    const { useCase, create } = setup();
    const createdAt = new Date("2024-01-02T03:04:05Z");

    const report = await useCase.execute([
      row({
        displayName: "  Alice  ",
        state: "SP",
        belief: "evangélica",
        showBelief: true,
        badges: ["first-comment"],
        tutorialsCompleted: ["chapter-v1"],
        emailVerifiedAt: new Date("2024-01-03T00:00:00Z"),
        createdAt,
      }),
    ]);

    expect(report.created).toBe(1);
    expect(report.imported).toBe(1);
    const [{ sessionVersion, ...created }] = create.mock.calls[0];
    expect(created).toEqual({
      _id: ALICE_ID,
      email: "alice@example.com",
      username: "alice",
      displayName: "Alice",
      password: "$2b$12$placeholder",
      state: "SP",
      belief: "evangélica",
      showBelief: true,
      moderator: false,
      badges: ["first-comment"],
      tutorialsCompleted: ["chapter-v1"],
      emailVerifiedAt: new Date("2024-01-03T00:00:00Z"),
      disabledAt: undefined,
      disabledBy: undefined,
      createdAt,
    });
    // Random, so a token minted before the loss (at a small version) is
    // rejected once the account is back under the same id.
    expect(Number.isInteger(sessionVersion)).toBe(true);
    expect(sessionVersion).toBeGreaterThanOrEqual(1);
    expect(sessionVersion).toBeLessThan(2 ** 31);
  });

  it("normalizes the original id, and lets the database assign one when the row has none", async () => {
    const { useCase, create } = setup();

    await useCase.execute([
      row({ _id: ALICE_ID.toUpperCase() }),
      row({ _id: undefined, email: "b@example.com", username: "b-user" }),
      row({ _id: "legacy-1", email: "c@example.com", username: "c-user" }),
    ]);

    const ids = create.mock.calls.map(([u]) => u._id);
    expect(ids).toEqual([ALICE_ID, undefined, undefined]);
    for (const [u] of create.mock.calls) {
      expect(u.sessionVersion).toBeGreaterThanOrEqual(1);
    }
  });

  it("falls back to the ObjectId's timestamp when the row has no createdAt", async () => {
    const { useCase, create } = setup();

    await useCase.execute([row()]);

    expect(create.mock.calls[0][0].createdAt).toEqual(ALICE_ID_TIME);
  });

  it("normalizes the e-mail before checking and storing it", async () => {
    const { useCase, create } = setup();

    await useCase.execute([row({ email: "  Alice@Example.COM " })]);

    expect(create.mock.calls[0][0].email).toBe("alice@example.com");
  });

  it("skips an account that was erased (its id has a tombstone)", async () => {
    const { useCase, create, findErased } = setup({ erased: [ALICE_ID] });

    const report = await useCase.execute([row({ _id: ALICE_ID.toUpperCase() })]);

    expect(findErased).toHaveBeenCalledWith([ALICE_ID]);
    expect(report.skipped.erased).toBe(1);
    expect(report.created).toBe(0);
    expect(create).not.toHaveBeenCalled();
  });

  it("does not query tombstones when no row carries an ObjectId", async () => {
    const { useCase, findErased } = setup();

    const report = await useCase.execute([row({ _id: undefined }), row({ _id: "legacy-1", email: "b@example.com", username: "b-user" })]);

    expect(findErased).not.toHaveBeenCalled();
    expect(report.created).toBe(2);
  });

  it.each([
    ["the same e-mail", fakeUser({ _id: "live1", email: "alice@example.com", username: "someone" })],
    ["a pending e-mail change to it", fakeUser({ _id: "live1", email: "x@example.com", username: "someone", pendingEmail: "alice@example.com" })],
    ["the same _id under a changed e-mail", fakeUser({ _id: ALICE_ID, email: "changed@example.com", username: "renamed" })],
  ])("skips a row whose account exists (%s)", async (_label, liveUser) => {
    const { useCase, create } = setup({ live: [liveUser] });

    const report = await useCase.execute([row()]);

    expect(report.skipped.exists).toBe(1);
    expect(create).not.toHaveBeenCalled();
  });

  it("skips rows that were mid-deletion, duplicated in the batch or have an invalid e-mail", async () => {
    const { useCase, create } = setup();

    const report = await useCase.execute([
      row({ email: "gone@example.com", username: "gone", deletion: { requestedAt: "2026-01-01" } }),
      row(),
      row({ _id: undefined, username: "alice-twin" }),
      row({ _id: undefined, email: "not-an-email", username: "carol" }),
    ]);

    expect(report.skipped).toMatchObject({ pendingDeletion: 1, duplicateInBatch: 1, invalidEmail: 1 });
    expect(report.created).toBe(1);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("applies the username rules: skips placeholder, reserved, slug-less and held names", async () => {
    const { useCase, create } = setup({
      live: [
        fakeUser({ _id: "b", email: "bob@example.com", username: "bob" }),
        fakeUser({ _id: "c", email: "carol@example.com", username: "carol-2", renameFrom: "carol" }),
      ],
    });

    const report = await useCase.execute([
      row({ _id: undefined, email: "s1@example.com", username: ANONYMIZED_USERNAME }),
      row({ _id: undefined, email: "s2@example.com", username: "Alguém" }),
      row({ _id: undefined, email: "r1@example.com", username: "system" }),
      row({ _id: undefined, email: "r2@example.com", username: "Deleted-User" }),
      row({ _id: undefined, email: "i1@example.com", username: "!!" }),
      row({ _id: undefined, email: "i2@example.com", username: "  " }),
      row({ _id: undefined, email: "t1@example.com", username: "BOB" }),
      row({ _id: undefined, email: "t2@example.com", username: "carol" }),
    ]);

    expect(report.skipped).toMatchObject({
      sentinelUsername: 2,
      reservedUsername: 2,
      invalidUsername: 2,
      usernameTaken: 2,
    });
    expect(report.created).toBe(0);
    expect(create).not.toHaveBeenCalled();
  });

  it("keeps grandfathered usernames verbatim instead of renaming them", async () => {
    const { useCase, create } = setup();

    await useCase.execute([
      row({ _id: undefined, email: "j@example.com", username: "JDaniloC" }),
      row({ _id: undefined, email: "s@example.com", username: " João Silva " }),
    ]);

    expect(create.mock.calls.map(([u]) => u.username)).toEqual(["JDaniloC", "João Silva"]);
  });

  it("skips a later row whose name an earlier row of the batch took", async () => {
    const { useCase } = setup();

    const report = await useCase.execute([
      row({ _id: undefined, email: "a1@example.com", username: "Same" }),
      row({ _id: undefined, email: "a2@example.com", username: "same" }),
    ]);

    expect(report.created).toBe(1);
    expect(report.skipped.usernameTaken).toBe(1);
  });

  it("hashes the placeholder once per restore, and not at all when nothing is created", async () => {
    const many = setup();
    await many.useCase.execute([
      row({ _id: undefined, email: "a@example.com", username: "a-user" }),
      row({ _id: undefined, email: "b@example.com", username: "b-user" }),
      row({ _id: undefined, email: "c@example.com", username: "c-user" }),
    ]);
    expect(many.placeholderHash).toHaveBeenCalledTimes(1);
    expect(new Set(many.create.mock.calls.map(([u]) => u.password)).size).toBe(1);

    const none = setup({ erased: [ALICE_ID] });
    await none.useCase.execute([row()]);
    expect(none.placeholderHash).not.toHaveBeenCalled();
  });

  it("purges whatever a former holder left under the username before creating", async () => {
    const { useCase, order } = setup();

    await useCase.execute([row()]);

    expect(order.slice(0, 3).sort()).toEqual(["notifications:alice", "push:alice", "reminder:alice"]);
    expect(order[3]).toBe("create:alice");
  });

  it("re-applies a ban, crediting a live moderator by exact name or anonymizing anyone else", async () => {
    const { useCase, create } = setup({
      live: [fakeUser({ _id: "m", email: "mod@example.com", username: "Moderador", moderator: true })],
    });
    const disabledAt = new Date("2026-02-02T00:00:00Z");

    await useCase.execute([
      row({ _id: undefined, email: "a@example.com", username: "banned-a", disabledAt, disabledBy: "Moderador" }),
      row({ _id: undefined, email: "b@example.com", username: "banned-b", disabledAt, disabledBy: "deleted-mod" }),
      // Only the case matches: a different (or re-registered) name.
      row({ _id: undefined, email: "d@example.com", username: "banned-d", disabledAt, disabledBy: "moderador" }),
      row({ _id: undefined, email: "c@example.com", username: "fine", disabledBy: "Moderador" }),
    ]);

    const created = create.mock.calls.map(([u]) => [u.username, u.disabledAt, u.disabledBy]);
    expect(created).toEqual([
      ["banned-a", disabledAt, "Moderador"],
      ["banned-b", disabledAt, ANONYMIZED_USERNAME],
      ["banned-d", disabledAt, ANONYMIZED_USERNAME],
      ["fine", undefined, undefined],
    ]);
  });

  it("counts a unique-index race as exists or usernameTaken and rethrows anything else", async () => {
    const { useCase, create } = setup();
    create
      .mockRejectedValueOnce(new Error("Email already registered"))
      .mockRejectedValueOnce(new Error("User id already taken"))
      .mockRejectedValueOnce(new Error("Username already taken"));

    const report = await useCase.execute([
      row({ _id: undefined, email: "a@example.com", username: "a-user" }),
      row(),
      row({ _id: undefined, email: "b@example.com", username: "b-user" }),
    ]);
    expect(report.skipped).toMatchObject({ exists: 2, usernameTaken: 1 });
    expect(report.created).toBe(0);

    create.mockRejectedValueOnce(new Error("connection reset"));
    await expect(
      useCase.execute([row({ _id: undefined, email: "c@example.com", username: "c-user" })]),
    ).rejects.toThrow("connection reset");
  });

  it("reports counts that add up to the rows received, and never an e-mail", async () => {
    const { useCase } = setup({
      live: [fakeUser({ _id: "b", email: "bob@example.com", username: "bob" })],
      erased: ["64b000000000000000000009"],
    });

    const report = await useCase.execute([
      row(),
      row({ _id: "64b000000000000000000009", email: "erased@example.com", username: "erased" }),
      row({ _id: undefined, email: "bob@example.com", username: "bob-again" }),
      row({ _id: undefined, email: "bad", username: "bad" }),
      row({ _id: undefined, email: "sys@example.com", username: "system" }),
    ]);

    const skipped = Object.values(report.skipped).reduce((a, b) => a + b, 0);
    expect(report.received).toBe(5);
    expect(report.created + skipped).toBe(report.received);
    expect(JSON.stringify(report)).not.toContain("@");
  });
});

describe("ImportCommentsUseCase", () => {
  const MOD = fakeUser({ _id: "m", email: "mod@example.com", username: "Moderador", moderator: true });

  function item(overrides: Partial<BackupCommentItem> = {}): BackupCommentItem {
    return {
      verseId: "v1",
      username: "alice",
      onTitle: false,
      bookReference: "Gn 1:1",
      text: "x",
      tags: [],
      ...overrides,
    } as BackupCommentItem;
  }

  function setup(live: User[], inserted?: number) {
    const createMany = vi.fn(async (rows: Comment[]) => inserted ?? rows.length);
    const findAll = vi.fn(async () => live);
    const user = { ...repoReturning(live), findAll };
    const useCase = new ImportCommentsUseCase({
      comment: { createMany } as unknown as ICommentRepository,
      user,
    });
    const written = () => createMany.mock.calls[0][0];
    return { useCase, createMany, findAll, written };
  }

  it("returns zeros and touches nothing when input is empty", async () => {
    const { useCase, createMany, findAll } = setup([]);

    const result = await useCase.execute([]);

    expect(result).toEqual({ received: 0, created: 0, anonymized: 0, rehidden: 0 });
    expect(createMany).not.toHaveBeenCalled();
    expect(findAll).not.toHaveBeenCalled();
  });

  it("attributes each row the way the live system has its author", async () => {
    const { useCase, written } = setup([
      fakeUser({ _id: "a", username: "alice" }),
      fakeUser({ _id: "j", email: "j@example.com", username: "JDaniloC" }),
      fakeUser({ _id: "l", email: "l@example.com", username: "leaving", deletion: DELETION }),
    ]);

    const result = await useCase.execute([
      item({ username: ANONYMIZED_USERNAME }),
      item({ username: "alice" }),
      item({ username: "JDaniloC" }),
      item({ username: "leaving" }),
      item({ username: "ghost" }),
      item({ username: "system" }),
    ]);

    expect(written().map((c) => c.username)).toEqual([
      ANONYMIZED_USERNAME,
      "alice",
      "JDaniloC",
      ANONYMIZED_USERNAME,
      ANONYMIZED_USERNAME,
      ANONYMIZED_USERNAME,
    ]);
    expect(result).toEqual({ received: 6, created: 6, anonymized: 3, rehidden: 0 });
  });

  it("never credits a row to an account whose name only matches ignoring case", async () => {
    const { useCase, written } = setup([
      fakeUser({ _id: "a", username: "alice" }),
      fakeUser({ _id: "j", email: "j@example.com", username: "JDaniloC" }),
    ]);

    const result = await useCase.execute([
      item({ username: "ALICE" }),
      item({ username: "jdaniloc" }),
    ]);

    expect(written().map((c) => c.username)).toEqual([ANONYMIZED_USERNAME, ANONYMIZED_USERNAME]);
    expect(result.anonymized).toBe(2);
  });

  it("credits rows under an unfinished rename's old name to the account's new name", async () => {
    const { useCase, written } = setup([
      MOD,
      fakeUser({ _id: "c", email: "carol@example.com", username: "carol-2", renameFrom: "carol" }),
      fakeUser({ _id: "m2", email: "m2@example.com", username: "mod-new", renameFrom: "mod-old" }),
    ]);

    const result = await useCase.execute([
      item({ username: "carol", verified: true, verifiedBy: "mod-old", verifiedAt: new Date("2026-01-01") }),
    ]);

    expect(written()[0]).toMatchObject({ username: "carol-2", verifiedBy: "mod-new" });
    expect(result.anonymized).toBe(0);
  });

  it("prefers the exact name when two legacy accounts differ only in case", async () => {
    const { useCase, written } = setup([
      fakeUser({ _id: "1", email: "1@example.com", username: "Ana" }),
      fakeUser({ _id: "2", email: "2@example.com", username: "ana" }),
    ]);

    await useCase.execute([item({ username: "ana" }), item({ username: "Ana" })]);

    expect(written().map((c) => c.username)).toEqual(["ana", "Ana"]);
  });

  it("hides a disabled author's visible comments as the disable cascade does", async () => {
    const disabledAt = new Date("2026-03-03T00:00:00Z");
    const { useCase, written } = setup([
      MOD,
      fakeUser({ username: "banned", disabledAt, disabledBy: "Moderador" }),
    ]);
    const modHiddenAt = new Date("2026-01-01T00:00:00Z");

    const result = await useCase.execute([
      item({ username: "banned", text: "visible" }),
      item({
        username: "banned",
        text: "already hidden",
        hiddenAt: modHiddenAt,
        hiddenBy: "Moderador",
        hiddenReason: "moderator",
      }),
    ]);

    const [visible, hidden] = written();
    expect(visible).toMatchObject({
      username: "banned",
      hiddenAt: disabledAt,
      hiddenBy: "Moderador",
      hiddenReason: "account-disabled",
    });
    expect(hidden).toMatchObject({ hiddenAt: modHiddenAt, hiddenBy: "Moderador", hiddenReason: "moderator" });
    expect(result.rehidden).toBe(1);
  });

  it("un-hides account-disabled rows of an author who was re-enabled since", async () => {
    const { useCase, written } = setup([MOD, fakeUser({ username: "alice" })]);

    await useCase.execute([
      item({ hiddenAt: new Date(), hiddenBy: "Moderador", hiddenReason: "account-disabled" }),
    ]);

    const [row] = written();
    expect(row.hiddenAt).toBeUndefined();
    expect(row.hiddenBy).toBeUndefined();
    expect(row.hiddenReason).toBeUndefined();
  });

  it("resolves moderator snapshots to an exact live name or anonymizes them", async () => {
    const { useCase, written } = setup([MOD, fakeUser({ username: "alice" })]);

    await useCase.execute([
      item({ verified: true, verifiedBy: "Moderador", verifiedAt: new Date("2026-01-01") }),
      item({
        verified: true,
        verifiedBy: "old-mod",
        hiddenAt: new Date("2026-01-02"),
        hiddenBy: "old-mod",
        hiddenReason: "moderator",
      }),
      item({ verified: true, verifiedBy: "moderador", verifiedAt: new Date("2026-01-03") }),
    ]);

    const [kept, gone, caseOnly] = written();
    expect(kept.verifiedBy).toBe("Moderador");
    expect(kept.verified).toBe(true);
    expect(gone.verifiedBy).toBe(ANONYMIZED_USERNAME);
    expect(gone.hiddenBy).toBe(ANONYMIZED_USERNAME);
    expect(gone.hiddenReason).toBe("moderator");
    expect(caseOnly.verifiedBy).toBe(ANONYMIZED_USERNAME);
  });

  it("keeps the original _id, createdAt and content fields", async () => {
    const { useCase, written } = setup([fakeUser({ username: "alice" })]);
    const createdAt = new Date("2023-05-05T00:00:00Z");

    await useCase.execute([
      item({
        _id: "64b0000000000000000000aa",
        createdAt,
        onTitle: true,
        tags: ["fé"],
        communitySlug: "jovens",
        text: "Comentário",
      }),
    ]);

    expect(written()[0]).toMatchObject({
      _id: "64b0000000000000000000aa",
      verseId: "v1",
      createdAt,
      onTitle: true,
      tags: ["fé"],
      communitySlug: "jovens",
      text: "Comentário",
      bookReference: "Gn 1:1",
    });
  });

  it("reports rows that already existed as received but not created", async () => {
    const { useCase } = setup([fakeUser({ username: "alice" })], 1);

    const result = await useCase.execute([
      item({ _id: "64b0000000000000000000a1" }),
      item({ _id: "64b0000000000000000000a2" }),
      item({ _id: "64b0000000000000000000a3" }),
    ]);

    expect(result).toEqual({ received: 3, created: 1, anonymized: 0, rehidden: 0 });
  });
});

describe("ImportDiscussionsUseCase", () => {
  function item(overrides: Partial<BackupDiscussionItem> = {}): BackupDiscussionItem {
    return {
      bookAbbrev: "gn",
      username: "alice",
      verseReference: "Gn 1:1",
      verseText: "",
      commentText: "",
      question: "?",
      ...overrides,
    } as BackupDiscussionItem;
  }

  function setup(live: User[], inserted?: number) {
    const createMany = vi.fn(async (rows: Discussion[]) => inserted ?? rows.length);
    const findAll = vi.fn(async () => live);
    const useCase = new ImportDiscussionsUseCase({
      discussion: { createMany } as unknown as IDiscussionRepository,
      user: { ...repoReturning(live), findAll },
    });
    return { useCase, createMany, findAll, written: () => createMany.mock.calls[0][0] };
  }

  it("returns zeros and touches nothing when input is empty", async () => {
    const { useCase, createMany, findAll } = setup([]);

    const result = await useCase.execute([]);

    expect(result).toEqual({ received: 0, created: 0, anonymized: 0 });
    expect(createMany).not.toHaveBeenCalled();
    expect(findAll).not.toHaveBeenCalled();
  });

  it("re-attributes live authors and anonymizes the rest", async () => {
    const { useCase, written } = setup([
      fakeUser({ username: "alice" }),
      fakeUser({ _id: "l", email: "l@example.com", username: "leaving", deletion: DELETION }),
    ]);

    const result = await useCase.execute([
      item({ username: "alice" }),
      item({ username: "Alice" }),
      item({ username: "leaving" }),
      item({ username: "ghost" }),
      item({ username: ANONYMIZED_USERNAME }),
    ]);

    expect(written().map((d) => d.username)).toEqual([
      "alice",
      ANONYMIZED_USERNAME,
      ANONYMIZED_USERNAME,
      ANONYMIZED_USERNAME,
      ANONYMIZED_USERNAME,
    ]);
    expect(result).toEqual({ received: 5, created: 5, anonymized: 3 });
  });

  it("credits rows under an unfinished rename's old name to the account's new name", async () => {
    const { useCase, written } = setup([
      fakeUser({ username: "carol-2", renameFrom: "carol" }),
    ]);

    const result = await useCase.execute([item({ username: "carol" })]);

    expect(written()[0].username).toBe("carol-2");
    expect(result.anonymized).toBe(0);
  });

  it("keeps the original _id, createdAt, comment link, title and excerpt", async () => {
    const { useCase, written } = setup([fakeUser({ username: "alice" })]);
    const createdAt = new Date("2023-06-06T00:00:00Z");

    await useCase.execute([
      item({
        _id: "64b0000000000000000000d1",
        commentId: "64b0000000000000000000c1",
        title: "Título",
        quoteStart: 0,
        quoteEnd: 4,
        createdAt,
      }),
    ]);

    expect(written()[0]).toMatchObject({
      _id: "64b0000000000000000000d1",
      commentId: "64b0000000000000000000c1",
      title: "Título",
      quoteStart: 0,
      quoteEnd: 4,
      createdAt,
    });
  });

  it("reports rows that already existed as received but not created", async () => {
    const { useCase } = setup([fakeUser({ username: "alice" })], 0);

    const result = await useCase.execute([item({ _id: "64b0000000000000000000d1" })]);

    expect(result).toEqual({ received: 1, created: 0, anonymized: 0 });
  });
});

describe("erasure backups", () => {
  it("exports every tombstone", async () => {
    const rows = [{ userId: "64b000000000000000000001", erasedAt: new Date("2026-01-01") }];
    const list = vi.fn(async () => rows);
    const useCase = new BackupErasuresUseCase({ list } as unknown as IAccountErasureRepository);

    expect(await useCase.execute()).toBe(rows);
  });

  it("merges tombstones back and reports how many were new", async () => {
    const upsertMany = vi.fn(async () => 1);
    const useCase = new RestoreErasuresUseCase({ upsertMany } as unknown as IAccountErasureRepository);
    const rows = [
      { userId: "64b000000000000000000001", erasedAt: new Date("2026-01-01") },
      { userId: "64b000000000000000000002", erasedAt: new Date("2026-01-02") },
    ];

    expect(await useCase.execute(rows)).toEqual({ received: 2, created: 1 });
    expect(upsertMany).toHaveBeenCalledWith(rows);
  });

  it("does nothing for an empty file", async () => {
    const upsertMany = vi.fn();
    const useCase = new RestoreErasuresUseCase({ upsertMany } as unknown as IAccountErasureRepository);

    expect(await useCase.execute([])).toEqual({ received: 0, created: 0 });
    expect(upsertMany).not.toHaveBeenCalled();
  });
});
