import { NextResponse } from "next/server";
import { MongoCommentRepository } from "@/infrastructure/repositories/MongoCommentRepository";
import { MongoCommentLikeRepository } from "@/infrastructure/repositories/MongoCommentLikeRepository";
import { MongoVerseRepository } from "@/infrastructure/repositories/MongoVerseRepository";
import { GetRecentFeedUseCase } from "@/application/use-cases/FeedUseCases";
import { badRequest, serverError } from "@/lib/get-session";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
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

    const useCase = new GetRecentFeedUseCase(
      new MongoCommentRepository(),
      new MongoCommentLikeRepository(),
      new MongoVerseRepository(),
    );
    const { items, nextCursor } = await useCase.execute({ cursor, limit });

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
