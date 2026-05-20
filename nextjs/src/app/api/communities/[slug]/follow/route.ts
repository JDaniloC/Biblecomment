import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { MongoCommunityRepository } from "@/infrastructure/repositories/MongoCommunityRepository";
import { MongoCommunityFollowRepository } from "@/infrastructure/repositories/MongoCommunityFollowRepository";
import { MongoUserRepository } from "@/infrastructure/repositories/MongoUserRepository";
import {
  FollowCommunityUseCase,
  UnfollowCommunityUseCase,
} from "@/application/use-cases/CommunityUseCases";

export const dynamic = "force-dynamic";

/**
 * Follow / unfollow a community.
 *
 * plan_community follow-up: distinct from membership. Anyone can follow,
 * no moderation hop. The follow list drives the active-community
 * selector in the AppHeader profile dropdown.
 */

async function sessionUserId(): Promise<string | null> {
  const session = await auth();
  if (!session?.user?.email) return null;
  const u = await new MongoUserRepository().findByEmail(session.user.email);
  return u?._id ?? null;
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const userId = await sessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { slug } = await params;
  try {
    const r = await new FollowCommunityUseCase(
      new MongoCommunityRepository(),
      new MongoCommunityFollowRepository(),
    ).execute({ slug: slug.toLowerCase(), userId });
    return NextResponse.json({ following: true, alreadyFollowed: r.alreadyFollowed });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown";
    if (msg.includes("não encontrada")) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const userId = await sessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { slug } = await params;
  try {
    const r = await new UnfollowCommunityUseCase(
      new MongoCommunityRepository(),
      new MongoCommunityFollowRepository(),
    ).execute({ slug: slug.toLowerCase(), userId });
    return NextResponse.json({ following: false, didRemove: r.didRemove });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown";
    if (msg.includes("não encontrada")) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
