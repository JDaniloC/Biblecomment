import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

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
