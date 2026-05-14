import { NextResponse } from "next/server";
import { MongoUserRepository } from "@/infrastructure/repositories/MongoUserRepository";

export const dynamic = "force-dynamic";

/**
 * Public profile fetch — anonymous-accessible projection of a user.
 * Returns 404 for unknown usernames. The repo method gates `belief`
 * on the user's `showBelief` opt-in flag, so the response never leaks
 * private fields (email, state, moderator, tutorials, password).
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params;
  const repo = new MongoUserRepository();
  const user = await repo.findByUsernamePublic(username.toLowerCase());
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json(user);
}
