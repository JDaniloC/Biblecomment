import { describe, it, expect, beforeEach, vi } from "vitest";
import type { User } from "@/domain/entities/User";

vi.mock("./logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// The default instance builds a MongoUserRepository; keep Mongo out of the test.
const { repoFindById } = vi.hoisted(() => ({ repoFindById: vi.fn() }));
vi.mock("@/infrastructure/repositories/MongoUserRepository", () => ({
  MongoUserRepository: class {
    findById = repoFindById;
  },
}));

import {
  createSessionRevalidator,
  loadSessionUser,
  forgetSessionUser,
} from "./session-revalidation";
import { logger } from "./logger";

function fakeUser(overrides: Partial<User> = {}): User {
  return {
    _id: "u1",
    email: "felipe@example.com",
    username: "felipe",
    displayName: "Felipe",
    password: "hashed",
    moderator: false,
    ...overrides,
  };
}

const T0 = 1_000_000;
const INACTIVE = { status: "inactive", fetchedAt: expect.any(Number) };

function setup(opts: { ttlMs?: number; maxEntries?: number } = {}) {
  let clock = T0;
  const users = new Map<string, User | null>();
  const now = () => clock;
  /** Another app instance: its own cache, the same DB and clock. */
  const instance = () => {
    const findById = vi.fn(async (id: string): Promise<User | null> => users.get(id) ?? null);
    const revalidator = createSessionRevalidator({
      findById,
      now,
      ttlMs: opts.ttlMs ?? 60_000,
      maxEntries: opts.maxEntries,
    });
    return { revalidator, findById };
  };
  return {
    ...instance(),
    instance,
    users,
    now,
    advance: (ms: number) => {
      clock += ms;
    },
  };
}

/** A promise whose resolution the test controls. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (err: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("createSessionRevalidator", () => {
  beforeEach(() => {
    vi.mocked(logger.warn).mockClear();
  });

  it("maps an active user to fresh claims", async () => {
    const { revalidator, users } = setup();
    users.set(
      "u1",
      fakeUser({ moderator: true, emailVerifiedAt: new Date(), pendingEmail: "new@example.com" }),
    );

    await expect(revalidator.loadSessionUser("u1")).resolves.toEqual({
      status: "active",
      user: {
        email: "felipe@example.com",
        username: "felipe",
        name: "Felipe",
        moderator: true,
        emailVerified: true,
        pendingEmail: "new@example.com",
      },
      fetchedAt: T0,
    });
  });

  it("falls back to username for name and defaults the optional claims", async () => {
    const { revalidator, users } = setup();
    users.set("u1", fakeUser({ displayName: undefined, moderator: undefined }));

    const state = await revalidator.loadSessionUser("u1");

    expect(state).toEqual({
      status: "active",
      user: expect.objectContaining({
        name: "felipe",
        moderator: false,
        emailVerified: false,
        pendingEmail: null,
      }),
      fetchedAt: T0,
    });
  });

  it("treats a missing user as inactive", async () => {
    const { revalidator } = setup();
    await expect(revalidator.loadSessionUser("ghost")).resolves.toEqual(INACTIVE);
  });

  it("treats a disabled user as inactive", async () => {
    const { revalidator, users } = setup();
    users.set("u1", fakeUser({ disabledAt: new Date(), disabledBy: "mod" }));
    await expect(revalidator.loadSessionUser("u1")).resolves.toEqual(INACTIVE);
  });

  it("treats a user with a deletion in progress as inactive", async () => {
    const { revalidator, users } = setup();
    users.set(
      "u1",
      fakeUser({ deletion: { requestedAt: new Date(), communityIds: [], discussionIds: [] } }),
    );
    await expect(revalidator.loadSessionUser("u1")).resolves.toEqual(INACTIVE);
  });

  it("serves repeat reads within the TTL from the cache", async () => {
    const { revalidator, users, findById, advance } = setup();
    users.set("u1", fakeUser());

    await revalidator.loadSessionUser("u1");
    users.set("u1", fakeUser({ username: "renamed" }));
    advance(59_999);
    const state = await revalidator.loadSessionUser("u1");

    expect(findById).toHaveBeenCalledTimes(1);
    expect(state).toMatchObject({ status: "active", user: { username: "felipe" } });
  });

  it("refetches once the TTL has elapsed", async () => {
    const { revalidator, users, findById, advance } = setup();
    users.set("u1", fakeUser());

    await revalidator.loadSessionUser("u1");
    users.set("u1", fakeUser({ disabledAt: new Date() }));
    advance(60_000);
    const state = await revalidator.loadSessionUser("u1");

    expect(findById).toHaveBeenCalledTimes(2);
    expect(state).toEqual(INACTIVE);
  });

  it("caches inactive results too", async () => {
    const { revalidator, findById } = setup();

    await revalidator.loadSessionUser("ghost");
    await revalidator.loadSessionUser("ghost");

    expect(findById).toHaveBeenCalledTimes(1);
  });

  it("fresh bypasses the cache and refreshes it", async () => {
    const { revalidator, users, findById } = setup();
    users.set("u1", fakeUser());

    await revalidator.loadSessionUser("u1");
    users.set("u1", fakeUser({ username: "renamed" }));
    const fresh = await revalidator.loadSessionUser("u1", { fresh: true });
    const cached = await revalidator.loadSessionUser("u1");

    expect(findById).toHaveBeenCalledTimes(2);
    expect(fresh).toMatchObject({ user: { username: "renamed" } });
    expect(cached).toMatchObject({ user: { username: "renamed" } });
  });

  it("forgetSessionUser forces the next read to hit the DB", async () => {
    const { revalidator, users, findById } = setup();
    users.set("u1", fakeUser());

    await revalidator.loadSessionUser("u1");
    users.delete("u1");
    revalidator.forgetSessionUser("u1");
    const state = await revalidator.loadSessionUser("u1");

    expect(findById).toHaveBeenCalledTimes(2);
    expect(state).toEqual(INACTIVE);
  });

  it("forgetSessionUser only drops the given user", async () => {
    const { revalidator, users, findById } = setup();
    users.set("u1", fakeUser());
    users.set("u2", fakeUser({ _id: "u2", username: "other" }));

    await revalidator.loadSessionUser("u1");
    await revalidator.loadSessionUser("u2");
    revalidator.forgetSessionUser("u1");
    await revalidator.loadSessionUser("u2");

    expect(findById).toHaveBeenCalledTimes(2);
  });

  it("returns unknown on a DB error, logs a warning and does not cache it", async () => {
    const { revalidator, users, findById } = setup();
    users.set("u1", fakeUser());
    findById.mockRejectedValueOnce(new Error("connection reset"));

    await expect(revalidator.loadSessionUser("u1")).resolves.toEqual({ status: "unknown" });
    expect(logger.warn).toHaveBeenCalledOnce();
    expect(revalidator.size()).toBe(0);

    await expect(revalidator.loadSessionUser("u1")).resolves.toMatchObject({ status: "active" });
    expect(findById).toHaveBeenCalledTimes(2);
  });

  it("shares one lookup between concurrent reads of the same user", async () => {
    const { revalidator, findById } = setup();
    const gate = deferred<User | null>();
    findById.mockReturnValueOnce(gate.promise);

    const a = revalidator.loadSessionUser("u1");
    const b = revalidator.loadSessionUser("u1");
    gate.resolve(fakeUser());

    await expect(a).resolves.toMatchObject({ status: "active" });
    await expect(b).resolves.toMatchObject({ status: "active" });
    expect(findById).toHaveBeenCalledTimes(1);
  });

  it("does not cache a lookup that was in flight when the user was forgotten", async () => {
    const { revalidator, users, findById } = setup();
    const gate = deferred<User | null>();
    findById.mockReturnValueOnce(gate.promise);

    // Read starts before the delete lands...
    const stale = revalidator.loadSessionUser("u1");
    revalidator.forgetSessionUser("u1");
    // ...and resolves with the pre-delete row afterwards.
    gate.resolve(fakeUser());
    await expect(stale).resolves.toMatchObject({ status: "active" });

    users.delete("u1");
    await expect(revalidator.loadSessionUser("u1")).resolves.toEqual(INACTIVE);
    expect(findById).toHaveBeenCalledTimes(2);
  });

  it("a fresh read supersedes an older in-flight one", async () => {
    const { revalidator, users, findById } = setup();
    const gate = deferred<User | null>();
    findById.mockReturnValueOnce(gate.promise);
    users.set("u1", fakeUser({ username: "renamed" }));

    const older = revalidator.loadSessionUser("u1");
    await revalidator.loadSessionUser("u1", { fresh: true });
    gate.resolve(fakeUser({ username: "felipe" }));
    await older;

    await expect(revalidator.loadSessionUser("u1")).resolves.toMatchObject({
      user: { username: "renamed" },
    });
    expect(findById).toHaveBeenCalledTimes(2);
  });

  it("evicts the oldest entry once maxEntries is exceeded", async () => {
    const { revalidator, users, findById } = setup({ maxEntries: 2 });
    for (const id of ["a", "b", "c"]) users.set(id, fakeUser({ _id: id }));

    await revalidator.loadSessionUser("a");
    await revalidator.loadSessionUser("b");
    await revalidator.loadSessionUser("c");
    expect(revalidator.size()).toBe(2);
    expect(findById).toHaveBeenCalledTimes(3);

    // "b" and "c" are still cached; "a" was evicted.
    await revalidator.loadSessionUser("b");
    await revalidator.loadSessionUser("c");
    expect(findById).toHaveBeenCalledTimes(3);
    await revalidator.loadSessionUser("a");
    expect(findById).toHaveBeenCalledTimes(4);
  });

  it("stamps results with the time their lookup started and expires them from there", async () => {
    const { revalidator, findById, advance } = setup();
    const gate = deferred<User | null>();
    findById.mockReturnValueOnce(gate.promise);

    const pending = revalidator.loadSessionUser("u1");
    advance(250);
    gate.resolve(fakeUser());
    await expect(pending).resolves.toMatchObject({ status: "active", fetchedAt: T0 });

    // TTL counts from fetchedAt (T0), not from when the lookup resolved.
    advance(60_000 - 250 - 1);
    await revalidator.loadSessionUser("u1");
    expect(findById).toHaveBeenCalledTimes(1);
    advance(1);
    await revalidator.loadSessionUser("u1");
    expect(findById).toHaveBeenCalledTimes(2);
  });

  it("treats a cached entry fetched before notBefore as a miss", async () => {
    const { revalidator, users, findById, advance } = setup();
    users.set("u1", fakeUser());
    await revalidator.loadSessionUser("u1");
    users.set("u1", fakeUser({ username: "renamed" }));
    advance(1_000);

    const state = await revalidator.loadSessionUser("u1", { notBefore: T0 + 500 });

    expect(findById).toHaveBeenCalledTimes(2);
    expect(state).toMatchObject({ user: { username: "renamed" }, fetchedAt: T0 + 1_000 });
  });

  it("serves a cached entry fetched at or after notBefore", async () => {
    const { revalidator, users, findById, advance } = setup();
    users.set("u1", fakeUser());
    await revalidator.loadSessionUser("u1");
    advance(1_000);

    const state = await revalidator.loadSessionUser("u1", { notBefore: T0 });

    expect(findById).toHaveBeenCalledTimes(1);
    expect(state).toMatchObject({ status: "active", fetchedAt: T0 });
  });

  it("keeps claims monotonic across instances that share a DB", async () => {
    const { users, instance, advance } = setup();
    const a = instance();
    const b = instance();
    users.set("u1", fakeUser());

    // Instance B caches the pre-rename row.
    await b.revalidator.loadSessionUser("u1");
    advance(1_000);

    // The user renames and changes email; update() forces a fresh read on A,
    // and the token records when that read started.
    users.set("u1", fakeUser({ username: "renamed", email: "new@example.com" }));
    const refreshed = await a.revalidator.loadSessionUser("u1", { fresh: true });
    expect(refreshed).toMatchObject({ user: { username: "renamed" } });
    const claimsAt = (refreshed as { fetchedAt: number }).fetchedAt;
    advance(1_000);

    // Without notBefore, B would still hand back the old claims...
    await expect(b.revalidator.loadSessionUser("u1")).resolves.toMatchObject({
      user: { username: "felipe", email: "felipe@example.com" },
    });
    // ...with the token's claimsAt it refetches instead of rolling them back.
    const next = await b.revalidator.loadSessionUser("u1", { notBefore: claimsAt });
    expect(next).toMatchObject({
      user: { username: "renamed", email: "new@example.com" },
    });
    expect((next as { fetchedAt: number }).fetchedAt).toBeGreaterThanOrEqual(claimsAt);
    expect(b.findById).toHaveBeenCalledTimes(2);

    // B's refreshed entry now satisfies the same token from cache.
    await b.revalidator.loadSessionUser("u1", { notBefore: claimsAt });
    expect(b.findById).toHaveBeenCalledTimes(2);
  });

  it("does not join an in-flight lookup that started before notBefore", async () => {
    const { revalidator, users, findById, advance } = setup();
    const gate = deferred<User | null>();
    findById.mockReturnValueOnce(gate.promise);
    users.set("u1", fakeUser({ username: "renamed" }));

    const older = revalidator.loadSessionUser("u1");
    advance(100);
    const newer = revalidator.loadSessionUser("u1", { notBefore: T0 + 50 });
    gate.resolve(fakeUser());

    await expect(older).resolves.toMatchObject({ user: { username: "felipe" } });
    await expect(newer).resolves.toMatchObject({ user: { username: "renamed" } });
    expect(findById).toHaveBeenCalledTimes(2);
    // The superseded older lookup did not overwrite the newer cache entry.
    await expect(revalidator.loadSessionUser("u1")).resolves.toMatchObject({
      user: { username: "renamed" },
    });
    expect(findById).toHaveBeenCalledTimes(2);
  });

  it("does not pin the user to unknown when findById throws synchronously", async () => {
    const { revalidator, users, findById } = setup();
    users.set("u1", fakeUser());
    findById.mockImplementationOnce(() => {
      throw new Error("driver exploded");
    });

    await expect(revalidator.loadSessionUser("u1")).resolves.toEqual({ status: "unknown" });
    expect(logger.warn).toHaveBeenCalledOnce();

    // The failed lookup cleaned up after itself; the next read hits the DB.
    await expect(revalidator.loadSessionUser("u1")).resolves.toMatchObject({ status: "active" });
    expect(findById).toHaveBeenCalledTimes(2);
  });

  it("joins an in-flight lookup younger than 5s", async () => {
    const { revalidator, findById, advance } = setup();
    const gate = deferred<User | null>();
    findById.mockReturnValueOnce(gate.promise);

    const first = revalidator.loadSessionUser("u1");
    advance(4_999);
    const second = revalidator.loadSessionUser("u1");
    gate.resolve(fakeUser());

    await expect(first).resolves.toMatchObject({ status: "active" });
    await expect(second).resolves.toMatchObject({ status: "active" });
    expect(findById).toHaveBeenCalledTimes(1);
  });

  it("starts a new lookup instead of joining one in flight for 5s or more", async () => {
    const { revalidator, users, findById, advance } = setup();
    const hung = deferred<User | null>();
    findById.mockReturnValueOnce(hung.promise);
    users.set("u1", fakeUser({ username: "renamed" }));

    const stuck = revalidator.loadSessionUser("u1");
    advance(5_000);
    await expect(revalidator.loadSessionUser("u1")).resolves.toMatchObject({
      user: { username: "renamed" },
      fetchedAt: T0 + 5_000,
    });
    expect(findById).toHaveBeenCalledTimes(2);

    // The hung lookup finally resolves with old data; it was superseded, so
    // it is returned to its own caller but does not replace the cache entry.
    hung.resolve(fakeUser());
    await expect(stuck).resolves.toMatchObject({ user: { username: "felipe" } });
    await expect(revalidator.loadSessionUser("u1")).resolves.toMatchObject({
      user: { username: "renamed" },
    });
    expect(findById).toHaveBeenCalledTimes(2);
  });
});

describe("default instance", () => {
  beforeEach(() => {
    repoFindById.mockReset();
  });

  it("loads through MongoUserRepository.findById and honors forgetSessionUser", async () => {
    repoFindById.mockResolvedValue(fakeUser({ _id: "default-1" }));

    await expect(loadSessionUser("default-1")).resolves.toMatchObject({ status: "active" });
    await loadSessionUser("default-1");
    expect(repoFindById).toHaveBeenCalledTimes(1);
    expect(repoFindById).toHaveBeenCalledWith("default-1");

    repoFindById.mockResolvedValue(null);
    forgetSessionUser("default-1");
    await expect(loadSessionUser("default-1")).resolves.toEqual(INACTIVE);
    expect(repoFindById).toHaveBeenCalledTimes(2);
  });
});
