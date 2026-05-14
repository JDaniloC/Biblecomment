import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { MongoFollowRepository } from "@/infrastructure/repositories/MongoFollowRepository";
import { MongoUserRepository } from "@/infrastructure/repositories/MongoUserRepository";
import { ListFollowConnectionsUseCase } from "@/application/use-cases/FollowUseCases";

const PAGE_SIZE = 30;

export const dynamic = "force-dynamic";

/** Public list of accounts that follow the target user, newest-first. */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params;
  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
  const session = await auth();
  const useCase = new ListFollowConnectionsUseCase(
    new MongoFollowRepository(),
    new MongoUserRepository(),
  );
  const result = await useCase.execute({
    targetUsername: username.toLowerCase(),
    direction: "followers",
    page,
    pageSize: PAGE_SIZE,
    viewerEmail: session?.user?.email ?? null,
  });
  if (!result) return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json({ ...result, page, pageSize: PAGE_SIZE });
}
