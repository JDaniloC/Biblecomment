import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { MongoCommunityRepository } from "@/infrastructure/repositories/MongoCommunityRepository";
import { MongoCommunityMembershipRepository } from "@/infrastructure/repositories/MongoCommunityMembershipRepository";
import { MongoUserRepository } from "@/infrastructure/repositories/MongoUserRepository";
import {
  JoinCommunityUseCase,
  LeaveCommunityUseCase,
} from "@/application/use-cases/CommunityUseCases";

/** POST = join (idempotent). DELETE = leave (idempotent). */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { slug } = await params;
  try {
    const result = await new JoinCommunityUseCase(
      new MongoCommunityRepository(),
      new MongoCommunityMembershipRepository(),
      new MongoUserRepository(),
    ).execute(session.user.email, slug.toLowerCase());
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown";
    if (msg.includes("Community")) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { slug } = await params;
  try {
    const result = await new LeaveCommunityUseCase(
      new MongoCommunityRepository(),
      new MongoCommunityMembershipRepository(),
      new MongoUserRepository(),
    ).execute(session.user.email, slug.toLowerCase());
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown";
    if (msg.includes("Community")) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
