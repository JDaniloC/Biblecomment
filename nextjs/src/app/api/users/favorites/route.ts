import { NextResponse } from "next/server";
import { MongoCommentRepository } from "@/infrastructure/repositories/MongoCommentRepository";
import { GetUserFavoritesUseCase } from "@/application/use-cases/CommentUseCases";
import { getSessionUser, unauthorized, serverError } from "@/lib/get-session";

const PAGE_SIZE = 50;

export async function GET(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("pages") ?? "1", 10);

    const repo = new MongoCommentRepository();
    const useCase = new GetUserFavoritesUseCase(repo);
    const favorites = await useCase.execute(user.username, page, PAGE_SIZE);
    return NextResponse.json({ favorites });
  } catch {
    return serverError();
  }
}
