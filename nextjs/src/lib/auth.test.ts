import { describe, it, expect, beforeEach, vi } from "vitest";
import bcrypt from "bcryptjs";
import type { NextAuthConfig } from "next-auth";
import type { JWT } from "next-auth/jwt";
import type { User } from "@/domain/entities/User";
import type { SessionUserClaims } from "@/lib/session-revalidation";

const { loadSessionUser, findByEmail, findByUsername, signIn, cookieJar } = vi.hoisted(() => {
  // The request's cookie jar as next/headers exposes it to a server action
  // or route handler: what signIn() sets is visible to later reads.
  const values = new Map<string, string>();
  const cookieJar = {
    values,
    getAll: () => [...values].map(([name, value]) => ({ name, value })),
    set: (name: string, value: string) => {
      values.set(name, value);
    },
  };
  return {
    loadSessionUser: vi.fn(),
    findByEmail: vi.fn(),
    findByUsername: vi.fn(),
    signIn: vi.fn(),
    cookieJar,
  };
});

// Only the config object is under test; keep the Auth.js runtime out.
vi.mock("next-auth", () => ({
  default: vi.fn(() => ({
    handlers: {},
    auth: vi.fn(),
    signIn,
    signOut: vi.fn(),
  })),
}));
vi.mock("next-auth/providers/credentials", () => ({
  default: (config: unknown) => config,
}));
vi.mock("next/headers", () => ({ cookies: async () => cookieJar }));
vi.mock("@/lib/session-revalidation", () => ({ loadSessionUser }));
vi.mock("@/infrastructure/repositories/MongoUserRepository", () => ({
  MongoUserRepository: class {
    findByEmail = findByEmail;
    findByUsername = findByUsername;
  },
}));

import { authConfig, reestablishSession } from "./auth";

type JwtParams = Parameters<NonNullable<NonNullable<NextAuthConfig["callbacks"]>["jwt"]>>[0];
type SessionParams = Parameters<NonNullable<NonNullable<NextAuthConfig["callbacks"]>["session"]>>[0];

function runJwt(params: Partial<JwtParams> & { token: JWT }) {
  return authConfig.callbacks!.jwt!({ account: null, ...params } as JwtParams);
}

async function runSession(token: JWT) {
  const session = await authConfig.callbacks!.session!({
    session: { user: {}, expires: "2099-01-01T00:00:00.000Z" },
    token,
  } as unknown as SessionParams);
  return session as unknown as { user: Record<string, unknown> };
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
  sessionVersion: 0,
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
    sessionVersion: 0,
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
  signIn.mockReset();
  cookieJar.values.clear();
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
        sessionVersion: 0,
      },
      trigger: "signIn",
    });

    expect(loadSessionUser).toHaveBeenCalledWith("u1", {
      fresh: true,
      notBefore: undefined,
      minSessionVersion: 0,
    });
    expect(token).toMatchObject({
      id: "u1",
      username: "felipe",
      tutorialsCompleted: ["chapter-v1"],
      sessionVersion: 0,
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

    expect(loadSessionUser).toHaveBeenCalledWith("u1", {
      fresh: true,
      notBefore: 1_000,
      minSessionVersion: 0,
    });
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

    expect(loadSessionUser).toHaveBeenCalledWith("u1", {
      fresh: false,
      notBefore: 1_000,
      minSessionVersion: 0,
    });
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

    expect(loadSessionUser).toHaveBeenCalledWith("u1", {
      fresh: false,
      notBefore: undefined,
      minSessionVersion: 0,
    });
    expect(token).toMatchObject({ claimsAt: 5_000 });
  });

  it("drops a token without an id instead of trusting its claims", async () => {
    const legacy = sessionToken({ id: "" });

    await expect(runJwt({ token: legacy })).resolves.toBeNull();
    expect(loadSessionUser).not.toHaveBeenCalled();
  });
});

describe("authConfig jwt callback: session version (revocation)", () => {
  const signInUser = (sessionVersion: number) => ({
    id: "u1",
    email: "felipe@example.com",
    name: "Felipe",
    username: "felipe",
    moderator: false,
    tutorialsCompleted: ["chapter-v1"],
    emailVerified: true,
    pendingEmail: null,
    sessionVersion,
  });

  it("copies the version authorize() returned into the token on sign-in", async () => {
    loadSessionUser.mockResolvedValue(activeState(5_000, { sessionVersion: 2 }));

    const token = await runJwt({
      token: { name: "Felipe", email: "felipe@example.com", sub: "u1" } as JWT,
      user: signInUser(2),
      trigger: "signIn",
    });

    expect(loadSessionUser).toHaveBeenCalledWith("u1", {
      fresh: true,
      notBefore: undefined,
      minSessionVersion: 2,
    });
    expect(token).toMatchObject({ id: "u1", sessionVersion: 2 });
  });

  it("refuses a sign-in whose verified document predates a newer bump", async () => {
    // authorize() read version 1 with the old password; a change landed
    // before the fresh read.
    loadSessionUser.mockResolvedValue(activeState(5_000, { sessionVersion: 2 }));

    await expect(
      runJwt({
        token: { name: "Felipe", email: "felipe@example.com", sub: "u1" } as JWT,
        user: signInUser(1),
        trigger: "signIn",
      }),
    ).resolves.toBeNull();
  });

  it("passes the token's version as minSessionVersion on a regular read", async () => {
    loadSessionUser.mockResolvedValue(activeState(5_000, { sessionVersion: 3 }));

    const token = await runJwt({ token: sessionToken({ sessionVersion: 3 }) });

    expect(loadSessionUser).toHaveBeenCalledWith("u1", {
      fresh: false,
      notBefore: 1_000,
      minSessionVersion: 3,
    });
    expect(token).toMatchObject({ sessionVersion: 3, claimsAt: 5_000 });
  });

  it("drops a token minted before the latest bump", async () => {
    loadSessionUser.mockResolvedValue(activeState(5_000, { sessionVersion: 2 }));

    await expect(runJwt({ token: sessionToken({ sessionVersion: 1 }) })).resolves.toBeNull();
  });

  it("drops a token whose version is ahead of the DB (e.g. after a restore)", async () => {
    loadSessionUser.mockResolvedValue(activeState(5_000, { sessionVersion: 1 }));

    await expect(runJwt({ token: sessionToken({ sessionVersion: 3 }) })).resolves.toBeNull();
  });

  it.each([
    ["no payload", undefined],
    ["a payload claiming the new version", { sessionVersion: 2 }],
    ["a payload with a forged grant", { sessionVersionGrant: { userId: "u1", version: 2 } }],
  ])("never revalidates a revoked token through trigger=update (%s)", async (_label, payload) => {
    loadSessionUser.mockResolvedValue(activeState(5_000, { sessionVersion: 2 }));

    await expect(
      runJwt({ token: sessionToken({ sessionVersion: 1 }), trigger: "update", session: payload }),
    ).resolves.toBeNull();
  });

  it("keeps a legacy token without the claim while the DB is at 0, normalizing it", async () => {
    loadSessionUser.mockResolvedValue(activeState(5_000, { sessionVersion: 0 }));
    const legacy = sessionToken();
    delete legacy.sessionVersion;

    const token = await runJwt({ token: legacy });

    expect(loadSessionUser).toHaveBeenCalledWith("u1", {
      fresh: false,
      notBefore: 1_000,
      minSessionVersion: 0,
    });
    expect(token).toMatchObject({ id: "u1", sessionVersion: 0 });
  });

  it("drops a legacy token without the claim once the DB was bumped", async () => {
    loadSessionUser.mockResolvedValue(activeState(5_000, { sessionVersion: 1 }));
    const legacy = sessionToken();
    delete legacy.sessionVersion;

    await expect(runJwt({ token: legacy })).resolves.toBeNull();
  });

  it("leaves the token unchanged when the lookup is unknown, whatever its version", async () => {
    loadSessionUser.mockResolvedValue({ status: "unknown" });
    const original = sessionToken({ sessionVersion: 7 });

    await expect(runJwt({ token: sessionToken({ sessionVersion: 7 }) })).resolves.toEqual(original);
  });
});

describe("authConfig session callback", () => {
  it("exposes the token's session version", async () => {
    const session = await runSession(sessionToken({ sessionVersion: 4 }));

    expect(session.user).toMatchObject({ id: "u1", username: "felipe", sessionVersion: 4 });
  });

  it("exposes 0 for a token without the claim", async () => {
    const legacy = sessionToken();
    delete legacy.sessionVersion;

    const session = await runSession(legacy);

    expect(session.user.sessionVersion).toBe(0);
  });
});

describe("reestablishSession", () => {
  /** signIn() as Auth.js runs it in-process: it writes the cookies it got. */
  function signInSetting(cookies: Record<string, string>) {
    signIn.mockImplementation(async () => {
      for (const [name, value] of Object.entries(cookies)) cookieJar.set(name, value);
      return "http://localhost/profile";
    });
  }

  it("signs the current browser in again with the new password", async () => {
    cookieJar.set("authjs.session-token", "old-token");
    signInSetting({ "authjs.session-token": "new-token" });

    await expect(reestablishSession("felipe@example.com", "new-secret")).resolves.toBe(true);
    expect(signIn).toHaveBeenCalledWith("credentials", {
      email: "felipe@example.com",
      password: "new-secret",
      redirect: false,
    });
  });

  it("recognizes the __Secure- cookie used over HTTPS", async () => {
    cookieJar.set("__Secure-authjs.session-token", "old-token");
    signInSetting({ "__Secure-authjs.session-token": "new-token" });

    await expect(reestablishSession("felipe@example.com", "new-secret")).resolves.toBe(true);
  });

  it("recognizes a session cookie split into chunks", async () => {
    signInSetting({
      "__Secure-authjs.session-token.0": "new-",
      "__Secure-authjs.session-token.1": "token",
    });

    await expect(reestablishSession("felipe@example.com", "new-secret")).resolves.toBe(true);
  });

  it("returns false when the sign-in cleared the cookie instead (jwt callback dropped it)", async () => {
    cookieJar.set("authjs.session-token", "old-token");
    signInSetting({ "authjs.session-token": "" });

    await expect(reestablishSession("felipe@example.com", "new-secret")).resolves.toBe(false);
  });

  it("returns false when the sign-in set no session cookie at all", async () => {
    cookieJar.set("authjs.session-token", "old-token");
    signInSetting({ "authjs.callback-url": "http://localhost/profile" });

    await expect(reestablishSession("felipe@example.com", "new-secret")).resolves.toBe(false);
  });

  it("returns false when the sign-in throws (e.g. CredentialsSignin)", async () => {
    cookieJar.set("authjs.session-token", "old-token");
    signIn.mockRejectedValue(Object.assign(new Error("CredentialsSignin"), { type: "CredentialsSignin" }));

    await expect(reestablishSession("felipe@example.com", "new-secret")).resolves.toBe(false);
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
      sessionVersion: 0,
    });
  });

  it("returns the session version of the document whose hash it verified", async () => {
    findByEmail.mockResolvedValue(dbUser({ sessionVersion: 2 }));

    await expect(
      authorize({ email: "felipe@example.com", password: PASSWORD }),
    ).resolves.toMatchObject({ id: "u1", sessionVersion: 2 });
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
