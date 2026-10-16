import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { loadSessionUser } from "@/lib/session-revalidation";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  username: string;
  moderator: boolean;
  /** Version the session token was minted at (absent on legacy tokens = 0). */
  sessionVersion?: number;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user) return null;
  return session.user as SessionUser;
}

/**
 * Like getSessionUser, but re-reads the account (bypassing the session
 * cache). Use it in route handlers and server actions for writes keyed by
 * the session's username (a row written under an account that is being
 * deleted would outlive its cascade and pass to the next owner of the
 * username) and for account-level writes: it also rejects a session revoked
 * by a password change on another instance (version mismatch) without
 * waiting for that instance's cache to expire. The claims come from that
 * read (a rename or e-mail change elsewhere is honoured). A lookup error
 * fails open, like the session. lib/session-revalidation.ts lists the
 * callers.
 */
export async function getActiveSessionUser(): Promise<SessionUser | null> {
  const user = await getSessionUser();
  if (!user) return null;
  const state = await loadSessionUser(user.id, { fresh: true });
  if (state.status === "inactive") return null;
  if (state.status === "active" && state.user.sessionVersion !== (user.sessionVersion ?? 0)) {
    return null;
  }
  // The session's own claims may predate a rename on this instance.
  return state.status === "active" ? { ...user, ...state.user, id: user.id } : user;
}

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function notFound(message = "Not found") {
  return NextResponse.json({ error: message }, { status: 404 });
}

/** 429 with a Retry-After (whole seconds, at least 1) until `resetAt` (epoch ms). */
export function tooManyRequests(message: string, resetAt: number) {
  const retryAfter = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
  return NextResponse.json(
    { error: message },
    { status: 429, headers: { "Retry-After": String(retryAfter) } },
  );
}

export function serverError(errOrMessage?: unknown) {
  const isString = typeof errOrMessage === "string";
  if (errOrMessage !== undefined && !isString) {
    logger.error({ err: errOrMessage }, "request failed");
  }
  return NextResponse.json(
    { error: isString ? errOrMessage : "Internal server error" },
    { status: 500 },
  );
}
