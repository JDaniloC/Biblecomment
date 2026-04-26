import { NextResponse } from "next/server";
import { MongoCommentRepository } from "@/infrastructure/repositories/MongoCommentRepository";
import { ListReportedCommentsUseCase } from "@/application/use-cases/CommentUseCases";
import { getSessionUser, forbidden, serverError } from "@/lib/get-session";

const PAGE_SIZE = 20;

export async function GET(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user?.moderator) return forbidden();

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);

    const repo = new MongoCommentRepository();
    const useCase = new ListReportedCommentsUseCase(repo);
    const items = await useCase.execute(page, PAGE_SIZE);

    return NextResponse.json({ page, pageSize: PAGE_SIZE, items });
  } catch (err) {
    return serverError(err);
  }
}
