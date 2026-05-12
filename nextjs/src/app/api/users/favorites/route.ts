import { NextResponse } from "next/server";
import { MongoCommentRepository } from "@/infrastructure/repositories/MongoCommentRepository";
import { MongoCommentLikeRepository } from "@/infrastructure/repositories/MongoCommentLikeRepository";
import { GetUserFavoritesUseCase } from "@/application/use-cases/CommentUseCases";
import { getSessionUser, unauthorized, serverError } from "@/lib/get-session";

const PAGE_SIZE = 50;

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("pages") ?? "1", 10);

    const useCase = new GetUserFavoritesUseCase(
      new MongoCommentRepository(),
      new MongoCommentLikeRepository(),
    );
    // Favorites are now keyed by userId in the CommentLike collection (see Phase 9.1).
    // Comments come back with likeCount + likedByMe (always true here) populated.
    const favorites = await useCase.execute(user.id, page, PAGE_SIZE);
    return NextResponse.json({ favorites });
  } catch (err) {
    return serverError(err);
  }
}
