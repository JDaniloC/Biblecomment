import { NextResponse } from "next/server";
import { MongoCommentRepository } from "@/infrastructure/repositories/MongoCommentRepository";
import { MongoCommentLikeRepository } from "@/infrastructure/repositories/MongoCommentLikeRepository";
import { MongoVerseRepository } from "@/infrastructure/repositories/MongoVerseRepository";
import { GetPopularFeedUseCase } from "@/application/use-cases/FeedUseCases";
import { serverError } from "@/lib/get-session";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
const DEFAULT_WINDOW_DAYS = 7;
const MAX_WINDOW_DAYS = 365;

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT),
    );
    const windowDays = Math.min(
      MAX_WINDOW_DAYS,
      Math.max(
        1,
        parseInt(searchParams.get("days") ?? String(DEFAULT_WINDOW_DAYS), 10) || DEFAULT_WINDOW_DAYS,
      ),
    );

    const useCase = new GetPopularFeedUseCase(
      new MongoCommentRepository(),
      new MongoCommentLikeRepository(),
      new MongoVerseRepository(),
    );
    const result = await useCase.execute({ limit, windowDays });

    return NextResponse.json({ items: result.items, windowDays });
  } catch (err) {
    return serverError(err);
  }
}
