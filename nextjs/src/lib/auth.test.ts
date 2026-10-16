import { describe, it, expect, beforeEach, vi } from "vitest";
import bcrypt from "bcryptjs";
import type { NextAuthConfig } from "next-auth";
import type { JWT } from "next-auth/jwt";
import type { User } from "@/domain/entities/User";
import type { SessionUserClaims } from "@/lib/session-revalidation";

const { loadSessionUser, findByEmail, findByUsername } = vi.hoisted(() => ({
  loadSessionUser: vi.fn(),
  findByEmail: vi.fn(),
  findByUsername: vi.fn(),
}));

// Only the config object is under test; keep the Auth.js runtime out.
vi.mock("next-auth", () => ({
  default: vi.fn(() => ({
    handlers: {},
    auth: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  })),
}));
vi.mock("next-auth/providers/credentials", () => ({
  default: (config: unknown) => config,
}));
vi.mock("@/lib/session-revalidation", () => ({ loadSessionUser }));
vi.mock("@/infrastructure/repositories/MongoUserRepository", () => ({
  MongoUserRepository: class {
    findByEmail = findByEmail;
    findByUsername = findByUsername;
  },
}));

import { authConfig } from "./auth";

type JwtParams = Parameters<NonNullable<NonNullable<NextAuthConfig["callbacks"]>["jwt"]>>[0];

function runJwt(params: Partial<JwtParams> & { token: JWT }) {
  return authConfig.callbacks!.jwt!({ account: null, ...params } as JwtParams);
}

type AuthorizeFn = (credentials: Record<string, unknown>) => Promise<unknown>;
// The Credentials mock is the identity, so the provider is its own config.
const authorize = (authConfig.providers[0] as unknown as { authorize: AuthorizeFn }).authorize;

const DB_CLAIMS: SessionUserClaims = {
  email: "felipe@example.com",
  username: "felipe",
  name: "Felipe",
  moderator: false,
  emailVerified: true,
  pendingEmail: null,
};

function activeState(fetchedAt: number, overrides: Partial<SessionUserClaims> = {}) {
  return { status: "active" as const, user: { ...DB_CLAIMS, ...overrides }, fetchedAt };
}

function sessionToken(overrides: Partial<JWT> = {}): JWT {
  return {
    id: "u1",
    sub: "u1",
    email: "felipe@example.com",
    name: "Felipe",
    username: "felipe",
    moderator: false,
    tutorialsCompleted: ["chapter-v1"],
    emailVerified: true,
    pendingEmail: null,
    claimsAt: 1_000,
    ...overrides,
  };
}

const PASSWORD = "correct horse";
const PASSWORD_HASH = bcrypt.hashSync(PASSWORD, 4);

function dbUser(overrides: Partial<User> = {}): User {
  return {
    _id: "u1",
    email: "felipe@example.com",
    username: "felipe",
    displayName: "Felipe",
    password: PASSWORD_HASH,
    moderator: false,
    tutorialsCompleted: ["chapter-v1"],
    emailVerifiedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

beforeEach(() => {
  loadSessionUser.mockReset();
  findByEmail.mockReset();
  findByUsername.mockReset();
});

describe("authConfig jwt callback", () => {
  it("does a fresh read on sign-in and stamps claimsAt", async () => {
    loadSessionUser.mockResolvedValue(activeState(5_000));

    const token = await runJwt({
      token: { name: "Felipe", email: "felipe@example.com", sub: "u1" } as JWT,
      user: {
        id: "u1",
        email: "felipe@example.com",
        name: "Felipe",
        username: "felipe",
        moderator: false,
        tutorialsCompleted: ["chapter-v1"],
        emailVerified: true,
        pendingEmail: null,
      },
      trigger: "signIn",
    });

    expect(loadSessionUser).toHaveBeenCalledWith("u1", { fresh: true, notBefore: undefined });
    expect(token).toMatchObject({
      id: "u1",
      username: "felipe",
      tutorialsCompleted: ["chapter-v1"],
      claimsAt: 5_000,
    });
  });

  it("does a fresh read on trigger=update and ignores the client payload", async () => {
    loadSessionUser.mockResolvedValue(activeState(5_000, { username: "renamed" }));

    const token = await runJwt({
      token: sessionToken(),
      trigger: "update",
      session: {
        email: "victim@example.com",
        username: "victim",
        name: "Victim",
        displayName: "Victim",
        emailVerified: true,
        pendingEmail: "attacker@example.com",
      },
    });

    expect(loadSessionUser).toHaveBeenCalledWith("u1", { fresh: true, notBefore: 1_000 });
    expect(token).toMatchObject({
      email: "felipe@example.com",
      username: "renamed",
      name: "Felipe",
      pendingEmail: null,
      claimsAt: 5_000,
    });
  });

  it("keeps the token's own claims when an update's lookup fails open", async () => {
    loadSessionUser.mockResolvedValue({ status: "unknown" });
    const original = sessionToken();

    const token = await runJwt({
      token: sessionToken(),
      trigger: "update",
      session: { email: "victim@example.com", username: "victim", name: "Victim" },
    });

    expect(token).toEqual(original);
  });

  it("drops the session of an inactive account", async () => {
    loadSessionUser.mockResolvedValue({ status: "inactive", fetchedAt: 5_000 });

    await expect(runJwt({ token: sessionToken() })).resolves.toBeNull();
  });

  it("leaves the token unchanged when the lookup is unknown", async () => {
    loadSessionUser.mockResolvedValue({ status: "unknown" });
    const original = sessionToken();

    const token = await runJwt({ token: sessionToken() });

    expect(token).toEqual(original);
  });

  it("overwrites claims from the DB on a regular read and sets claimsAt", async () => {
    loadSessionUser.mockResolvedValue(
      activeState(5_000, {
        email: "new@example.com",
        username: "renamed",
        name: "Renamed",
        moderator: true,
        emailVerified: false,
        pendingEmail: "pending@example.com",
      }),
    );

    const token = await runJwt({ token: sessionToken() });

    expect(loadSessionUser).toHaveBeenCalledWith("u1", { fresh: false, notBefore: 1_000 });
    expect(token).toEqual(
      sessionToken({
        email: "new@example.com",
        username: "renamed",
        name: "Renamed",
        moderator: true,
        emailVerified: false,
        pendingEmail: "pending@example.com",
        claimsAt: 5_000,
      }),
    );
  });

  it("never moves claimsAt backwards", async () => {
    loadSessionUser.mockResolvedValue(activeState(900));

    const token = await runJwt({ token: sessionToken({ claimsAt: 1_000 }) });

    expect(token).toMatchObject({ claimsAt: 1_000 });
  });

  it("passes no notBefore for a token minted before claimsAt existed", async () => {
    loadSessionUser.mockResolvedValue(activeState(5_000));
    const legacy = sessionToken();
    delete legacy.claimsAt;

    const token = await runJwt({ token: legacy });

    expect(loadSessionUser).toHaveBeenCalledWith("u1", { fresh: false, notBefore: undefined });
    expect(token).toMatchObject({ claimsAt: 5_000 });
  });

  it("drops a token without an id instead of trusting its claims", async () => {
    const legacy = sessionToken({ id: "" });

    await expect(runJwt({ token: legacy })).resolves.toBeNull();
    expect(loadSessionUser).not.toHaveBeenCalled();
  });
});

describe("Credentials authorize()", () => {
  it("accepts a normal user by email", async () => {
    findByEmail.mockResolvedValue(dbUser());

    const result = await authorize({ email: "  Felipe@Example.com ", password: PASSWORD });

    expect(findByEmail).toHaveBeenCalledWith("felipe@example.com");
    expect(result).toEqual({
      id: "u1",
      email: "felipe@example.com",
      name: "Felipe",
      username: "felipe",
      moderator: false,
      tutorialsCompleted: ["chapter-v1"],
      emailVerified: true,
      pendingEmail: null,
    });
  });

  it("looks a username identifier up by username", async () => {
    findByUsername.mockResolvedValue(dbUser());

    await expect(authorize({ email: "Felipe", password: PASSWORD })).resolves.toMatchObject({
      id: "u1",
    });
    expect(findByUsername).toHaveBeenCalledWith("felipe");
    expect(findByEmail).not.toHaveBeenCalled();
  });

  it("rejects a wrong password", async () => {
    findByEmail.mockResolvedValue(dbUser());

    await expect(
      authorize({ email: "felipe@example.com", password: "wrong" }),
    ).resolves.toBeNull();
  });

  it("rejects a user whose deletion is in progress", async () => {
    findByEmail.mockResolvedValue(
      dbUser({ deletion: { requestedAt: new Date(), communityIds: [], discussionIds: [] } }),
    );

    await expect(
      authorize({ email: "felipe@example.com", password: PASSWORD }),
    ).resolves.toBeNull();
  });

  it("rejects a moderator-disabled user", async () => {
    findByEmail.mockResolvedValue(dbUser({ disabledAt: new Date(), disabledBy: "mod" }));

    await expect(
      authorize({ email: "felipe@example.com", password: PASSWORD }),
    ).resolves.toBeNull();
  });
});
