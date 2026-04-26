import { NextResponse } from "next/server";
import { MongoCommentRepository } from "@/infrastructure/repositories/MongoCommentRepository";
import { GetAllCommentsPaginatedUseCase } from "@/application/use-cases/CommentUseCases";
import { serverError } from "@/lib/get-session";

const PAGE_SIZE = 5;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("pages") ?? "1", 10);

    const repo = new MongoCommentRepository();
    const useCase = new GetAllCommentsPaginatedUseCase(repo);
    return NextResponse.json(await useCase.execute(page, PAGE_SIZE));
  } catch (err) {
    return serverError(err);
  }
}
