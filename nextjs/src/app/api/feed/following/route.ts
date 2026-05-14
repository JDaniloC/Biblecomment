import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { MongoUserRepository } from "@/infrastructure/repositories/MongoUserRepository";
import { MongoCommentRepository } from "@/infrastructure/repositories/MongoCommentRepository";
import { MongoCommentLikeRepository } from "@/infrastructure/repositories/MongoCommentLikeRepository";
import { MongoVerseRepository } from "@/infrastructure/repositories/MongoVerseRepository";
import { MongoFollowRepository } from "@/infrastructure/repositories/MongoFollowRepository";
import { GetFollowingFeedUseCase } from "@/application/use-cases/FollowUseCases";
import { badRequest, serverError, unauthorized } from "@/lib/get-session";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

export const dynamic = "force-dynamic";

/**
 * Cursor-paginated feed restricted to comments authored by users the viewer
 * follows. 401 for anonymous (follow is a relationship — anonymous viewers
 * don't have one).
 */
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) return unauthorized();

    const { searchParams } = new URL(req.url);
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT),
    );

    const cursorAt = searchParams.get("cursorAt");
    const cursorId = searchParams.get("cursorId");
    let cursor: { createdAt: Date; id: string } | null = null;
    if (cursorAt && cursorId) {
      const d = new Date(cursorAt);
      if (isNaN(d.getTime())) return badRequest("Invalid cursorAt");
      cursor = { createdAt: d, id: cursorId };
    }

    const useCase = new GetFollowingFeedUseCase(
      new MongoFollowRepository(),
      new MongoUserRepository(),
      new MongoCommentRepository(),
      new MongoCommentLikeRepository(),
      new MongoVerseRepository(),
    );
    const { items, nextCursor } = await useCase.execute({
      viewerEmail: session.user.email,
      cursor,
      limit,
    });

    return NextResponse.json({
      items,
      nextCursor: nextCursor
        ? { createdAt: nextCursor.createdAt.toISOString(), id: nextCursor.id }
        : null,
    });
  } catch (err) {
    return serverError(err);
  }
}
