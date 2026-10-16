/**
 * Per-request revalidation of JWT sessions against the user table.
 *
 * Sessions use the stateless "jwt" strategy, and Auth.js rolls them: every
 * session read re-encodes the token with a fresh expiry. Without this, a
 * deleted or moderator-disabled account would keep a valid cookie (and its
 * stale username/email/moderator claims) for as long as it kept being used.
 * Worse, once a deleted account's username is re-registered, the old token
 * would author records under the new owner's slug.
 *
 * The jwt callback in lib/auth.ts asks `loadSessionUser` on every session
 * read. To keep Atlas M0 (pool of 3) out of the hot path, lookups are cached
 * in-process for a short TTL and concurrent misses for the same user share a
 * single query. The cache is per process: `forgetSessionUser` only reaches
 * the instance that runs it, other instances converge within the TTL.
 *
 * Claim freshness is monotonic per token: every result carries `fetchedAt`
 * (when its DB read started), the token records it as `claimsAt`, and the
 * next read passes it back as `notBefore`. A cache entry or in-flight lookup
 * older than that is a miss, so an instance still holding a pre-rename entry
 * can't roll a token back to the old username/email after another instance
 * refreshed it. This compares clocks across instances, so it is as precise as
 * their clock sync; skew only widens the window, it never makes it unbounded.
 *
 * Revocation: a password change or reset (and disabling) bumps the user's
 * `sessionVersion`, and the jwt callback rejects a token minted at another
 * version. The token passes its version as `minSessionVersion`, so data read
 * before the bump (another instance's cache, or a lookup that slipped past
 * `notBefore` through clock skew) can never log out the device that was just
 * re-signed at the new version. The other direction keeps the TTL bound: an
 * old token served from another instance's pre-bump entry survives there for
 * at most 60s, the same as disable/delete.
 *
 * Within that window a revoked session can still read, and can still do
 * everyday writes (comments, discussions, likes, follows, reading data,
 * profile fields), which is accepted. These re-check with a fresh read
 * (getActiveSessionUser in lib/get-session.ts) and are refused at once:
 * - the data export and the comment import (/api/users/me/export, /import);
 * - account changes: e-mail change request and cancel, password change
 *   (action and /api/users/me/password), rename, self-deletion (action and
 *   DELETE /api/users, which also serves moderator deletions);
 * - push subscription (POST /api/push/subscribe) and the reading reminder
 *   (PUT /api/me/reading-reminder);
 * - the admin backups (/api/backup/*).
 */

import { MongoUserRepository } from "@/infrastructure/repositories/MongoUserRepository";
import type { User } from "@/domain/entities/User";
import { logger } from "./logger";

/** Claims the JWT mirrors from the user record. The DB is the source of truth. */
export interface SessionUserClaims {
  email: string;
  username: string;
  /** displayName, falling back to the username for legacy accounts. */
  name: string;
  moderator: boolean;
  emailVerified: boolean;
  pendingEmail: string | null;
  /** User.sessionVersion (0 when absent); a token at another version is revoked. */
  sessionVersion: number;
}

/**
 * - `active`: the account may hold a session; `user` carries fresh claims.
 * - `inactive`: missing, disabled, or mid-deletion — drop the session.
 * - `unknown`: the lookup failed. Callers fail open and keep the token's
 *   existing claims so a transient DB hiccup doesn't log everyone out.
 *
 * `fetchedAt` (epoch ms) is when the DB read behind the result started: the
 * result reflects every write committed before that instant.
 */
export type SessionUserState =
  | { status: "active"; user: SessionUserClaims; fetchedAt: number }
  | { status: "inactive"; fetchedAt: number }
  | { status: "unknown" };

type CachedState = Exclude<SessionUserState, { status: "unknown" }>;

export interface LoadSessionUserOptions {
  /** Skip the cache and any in-flight lookup (sign-in, or right after a write). */
  fresh?: boolean;
  /**
   * Epoch ms. A cached entry or in-flight lookup whose data was fetched before
   * this is treated as a miss. Pass the token's `claimsAt` so a token's claims
   * never go back to an older read.
   */
  notBefore?: number;
  /**
   * The token's `sessionVersion`. A cached entry or joined in-flight lookup
   * for an active account below it predates the bump that minted the token,
   * so it is treated as a miss. A new read is returned as-is.
   */
  minSessionVersion?: number;
}

export interface SessionRevalidatorDeps {
  findById: (userId: string) => Promise<User | null>;
  /** Clock in ms; injectable for tests. */
  now?: () => number;
  ttlMs?: number;
  maxEntries?: number;
  /** In-flight lookups older than this are not joined; a new one starts. */
  maxInflightAgeMs?: number;
}

export interface SessionRevalidator {
  loadSessionUser(userId: string, opts?: LoadSessionUserOptions): Promise<SessionUserState>;
  forgetSessionUser(userId: string): void;
  /** Number of cached entries (tests/diagnostics). */
  size(): number;
  clear(): void;
}

export const SESSION_CACHE_TTL_MS = 60_000;
export const SESSION_CACHE_MAX_ENTRIES = 1000;
export const SESSION_INFLIGHT_MAX_AGE_MS = 5_000;

const UNKNOWN: SessionUserState = { status: "unknown" };

function toState(user: User | null, fetchedAt: number): CachedState {
  if (!user || user.disabledAt || user.deletion) return { status: "inactive", fetchedAt };
  return {
    status: "active",
    user: {
      email: user.email,
      username: user.username,
      name: user.displayName ?? user.username,
      moderator: user.moderator ?? false,
      emailVerified: !!user.emailVerifiedAt,
      pendingEmail: user.pendingEmail ?? null,
      sessionVersion: user.sessionVersion ?? 0,
    },
    fetchedAt,
  };
}

/** Whether `state` was read before the token's version was minted. */
function predatesVersion(state: SessionUserState, min: number): boolean {
  return state.status === "active" && state.user.sessionVersion < min;
}

export function createSessionRevalidator(deps: SessionRevalidatorDeps): SessionRevalidator {
  const now = deps.now ?? Date.now;
  const ttlMs = deps.ttlMs ?? SESSION_CACHE_TTL_MS;
  const maxEntries = Math.max(1, deps.maxEntries ?? SESSION_CACHE_MAX_ENTRIES);
  const maxInflightAgeMs = deps.maxInflightAgeMs ?? SESSION_INFLIGHT_MAX_AGE_MS;

  // Map iteration order is insertion order, so the first key is the oldest.
  // An entry expires `ttlMs` after its data was fetched.
  const cache = new Map<string, CachedState>();
  // In-flight lookups. `seq` lets a lookup tell whether it was superseded
  // (by `forgetSessionUser`, a `fresh` read, or a newer lookup started
  // because this one was too old to join) before it resolved; a superseded
  // result is returned to its own callers but never cached, so a read that
  // raced a delete can't re-cache the account as active.
  const inflight = new Map<
    string,
    { seq: number; startedAt: number; promise: Promise<SessionUserState> }
  >();
  let seqCounter = 0;

  function remember(userId: string, state: CachedState) {
    cache.delete(userId);
    cache.set(userId, state);
    while (cache.size > maxEntries) {
      const oldest = cache.keys().next().value as string;
      cache.delete(oldest);
    }
  }

  function lookup(userId: string): Promise<SessionUserState> {
    const seq = ++seqCounter;
    const startedAt = now();
    const isCurrent = () => inflight.get(userId)?.seq === seq;
    // `deps.findById` runs on a later microtask, so the in-flight entry is
    // registered below before any of it (or a synchronous throw from it)
    // can settle the lookup and try to clean the entry up.
    const promise = Promise.resolve().then(async (): Promise<SessionUserState> => {
      try {
        const state = toState(await deps.findById(userId), startedAt);
        if (isCurrent()) remember(userId, state);
        return state;
      } catch (err) {
        logger.warn(
          { err, userId, action: "loadSessionUser" },
          "session revalidation lookup failed; keeping token claims",
        );
        return UNKNOWN;
      } finally {
        if (isCurrent()) inflight.delete(userId);
      }
    });
    inflight.set(userId, { seq, startedAt, promise });
    return promise;
  }

  return {
    async loadSessionUser(userId, opts) {
      if (!opts?.fresh) {
        const notBefore = opts?.notBefore ?? -Infinity;
        const minVersion = opts?.minSessionVersion ?? 0;
        const t = now();
        const hit = cache.get(userId);
        if (hit) {
          if (
            hit.fetchedAt + ttlMs > t &&
            hit.fetchedAt >= notBefore &&
            !predatesVersion(hit, minVersion)
          ) {
            return hit;
          }
          cache.delete(userId);
        }
        const pending = inflight.get(userId);
        if (
          pending &&
          pending.startedAt >= notBefore &&
          t - pending.startedAt < maxInflightAgeMs
        ) {
          const joined = await pending.promise;
          // The shared read started before the bump: read again, once.
          return predatesVersion(joined, minVersion) ? lookup(userId) : joined;
        }
      }
      return lookup(userId);
    },
    forgetSessionUser(userId) {
      cache.delete(userId);
      inflight.delete(userId);
    },
    size: () => cache.size,
    clear() {
      cache.clear();
      inflight.clear();
    },
  };
}

declare global {
  // eslint-disable-next-line no-var
  var sessionRevalidator: SessionRevalidator | undefined;
}

let userRepo: MongoUserRepository | null = null;

// One cache per process, held on globalThis. The production build bundles
// this module more than once (the server-action layer and the route/RSC
// layer each get a copy), and a module-level instance would give each copy
// its own cache — forgetSessionUser from an action would then never reach
// the cache the NextAuth jwt callback reads. Same pattern as mongooseCache.
const defaultRevalidator = (globalThis.sessionRevalidator ??= createSessionRevalidator({
  findById: (userId) => (userRepo ??= new MongoUserRepository()).findById(userId),
}));

/**
 * Current session-relevant state of `userId`. `fresh` skips the cache (use it
 * right after sign-in or a write that changed the user); `notBefore` rejects
 * cached data older than the token's current claims, and `minSessionVersion`
 * rejects cached data read before the token's session version existed.
 */
export function loadSessionUser(
  userId: string,
  opts?: LoadSessionUserOptions,
): Promise<SessionUserState> {
  return defaultRevalidator.loadSessionUser(userId, opts);
}

/**
 * Drop the cached state so the next session read in this process hits the
 * DB. Call after deleting, disabling, re-enabling or renaming a user, and
 * after changing or resetting their password.
 */
export function forgetSessionUser(userId: string): void {
  defaultRevalidator.forgetSessionUser(userId);
}
