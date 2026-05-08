import { NextResponse } from "next/server";
import { MongoCommentRepository } from "@/infrastructure/repositories/MongoCommentRepository";
import { MongoCommentReportRepository } from "@/infrastructure/repositories/MongoCommentReportRepository";
import { ListAllCommentsForModerationUseCase } from "@/application/use-cases/CommentUseCases";
import { getSessionUser, forbidden, serverError } from "@/lib/get-session";

const PAGE_SIZE = 20;

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user?.moderator) return forbidden();

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
    const q = searchParams.get("q")?.trim() || undefined;

    const useCase = new ListAllCommentsForModerationUseCase(
      new MongoCommentRepository(),
      new MongoCommentReportRepository(),
    );
    const result = await useCase.execute(page, PAGE_SIZE, q);
    return NextResponse.json(result);
  } catch (err) {
    return serverError(err);
  }
}
