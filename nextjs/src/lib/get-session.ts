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
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user) return null;
  return session.user as SessionUser;
}

/**
 * Like getSessionUser, but re-reads the account (bypassing the session
 * cache) for writes keyed by the session's username: a row written under an
 * account that is being deleted would outlive its cascade and pass to the
 * next owner of the username. A lookup error fails open, like the session.
 */
export async function getActiveSessionUser(): Promise<SessionUser | null> {
  const user = await getSessionUser();
  if (!user) return null;
  const state = await loadSessionUser(user.id, { fresh: true });
  if (state.status === "inactive") return null;
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
