import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { SessionUserClaims } from "@/lib/session-revalidation";

const { auth, loadSessionUser } = vi.hoisted(() => ({
  auth: vi.fn(),
  loadSessionUser: vi.fn(),
}));

// Keep Auth.js and Mongo out: only the glue in get-session is under test.
vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("@/lib/session-revalidation", () => ({ loadSessionUser }));

import { getActiveSessionUser, getSessionUser, tooManyRequests } from "./get-session";

const SESSION_USER = {
  id: "u1",
  name: "Felipe",
  email: "felipe@example.com",
  username: "felipe",
  moderator: false,
  sessionVersion: 1,
};

function dbClaims(overrides: Partial<SessionUserClaims> = {}): SessionUserClaims {
  return {
    email: "felipe@example.com",
    username: "felipe",
    name: "Felipe",
    moderator: false,
    emailVerified: true,
    pendingEmail: null,
    sessionVersion: 1,
    ...overrides,
  };
}

function signedIn(user: Record<string, unknown> = SESSION_USER) {
  auth.mockResolvedValue({ user, expires: "2099-01-01T00:00:00.000Z" });
}

beforeEach(() => {
  auth.mockReset();
  loadSessionUser.mockReset();
});

describe("getSessionUser", () => {
  it("returns null without a session", async () => {
    auth.mockResolvedValue(null);
    await expect(getSessionUser()).resolves.toBeNull();
  });

  it("returns the session's user", async () => {
    signedIn();
    await expect(getSessionUser()).resolves.toEqual(SESSION_USER);
  });
});

describe("getActiveSessionUser", () => {
  it("returns null without a session and skips the DB", async () => {
    auth.mockResolvedValue(null);

    await expect(getActiveSessionUser()).resolves.toBeNull();
    expect(loadSessionUser).not.toHaveBeenCalled();
  });

  it("re-reads the account bypassing the session cache", async () => {
    signedIn();
    loadSessionUser.mockResolvedValue({ status: "active", user: dbClaims(), fetchedAt: 1 });

    await getActiveSessionUser();

    expect(loadSessionUser).toHaveBeenCalledWith("u1", { fresh: true });
  });

  it("returns the session merged with the fresh claims when the versions match", async () => {
    signedIn();
    loadSessionUser.mockResolvedValue({
      status: "active",
      user: dbClaims({ username: "renamed", name: "Renamed" }),
      fetchedAt: 1,
    });

    await expect(getActiveSessionUser()).resolves.toMatchObject({
      id: "u1",
      username: "renamed",
      name: "Renamed",
      sessionVersion: 1,
    });
  });

  it("returns null when a password change on another instance bumped the version", async () => {
    signedIn();
    loadSessionUser.mockResolvedValue({
      status: "active",
      user: dbClaims({ sessionVersion: 2 }),
      fetchedAt: 1,
    });

    await expect(getActiveSessionUser()).resolves.toBeNull();
  });

  it("treats a session without the claim as version 0", async () => {
    const { sessionVersion: _v, ...legacy } = SESSION_USER;
    signedIn(legacy);

    loadSessionUser.mockResolvedValue({
      status: "active",
      user: dbClaims({ sessionVersion: 0 }),
      fetchedAt: 1,
    });
    await expect(getActiveSessionUser()).resolves.toMatchObject({ id: "u1" });

    loadSessionUser.mockResolvedValue({
      status: "active",
      user: dbClaims({ sessionVersion: 1 }),
      fetchedAt: 1,
    });
    await expect(getActiveSessionUser()).resolves.toBeNull();
  });

  it("returns null for an inactive account", async () => {
    signedIn();
    loadSessionUser.mockResolvedValue({ status: "inactive", fetchedAt: 1 });

    await expect(getActiveSessionUser()).resolves.toBeNull();
  });

  it("fails open with the session's own user when the lookup is unknown", async () => {
    signedIn();
    loadSessionUser.mockResolvedValue({ status: "unknown" });

    await expect(getActiveSessionUser()).resolves.toEqual(SESSION_USER);
  });
});

describe("tooManyRequests", () => {
  const NOW = Date.UTC(2026, 0, 1);

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("answers 429 with the message and Retry-After rounded up to whole seconds", async () => {
    const res = tooManyRequests("Muitas importações em pouco tempo.", NOW + 1_500);

    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("2");
    await expect(res.json()).resolves.toEqual({ error: "Muitas importações em pouco tempo." });
  });

  it("never sends a Retry-After below 1", () => {
    expect(tooManyRequests("x", NOW).headers.get("Retry-After")).toBe("1");
    expect(tooManyRequests("x", NOW - 10_000).headers.get("Retry-After")).toBe("1");
  });
});
