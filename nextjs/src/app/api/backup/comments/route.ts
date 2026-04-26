import { NextResponse } from "next/server";
import { MongoCommentRepository } from "@/infrastructure/repositories/MongoCommentRepository";
import { GetAllCommentsUseCase } from "@/application/use-cases/CommentUseCases";
import { ImportCommentsUseCase } from "@/application/use-cases/BackupUseCases";
import { getSessionUser, forbidden, serverError } from "@/lib/get-session";
import { parseBody } from "@/lib/parse-body";
import { BackupCommentsSchema } from "@/lib/schemas";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user?.moderator) return forbidden();

    const repo = new MongoCommentRepository();
    const useCase = new GetAllCommentsUseCase(repo);
    return NextResponse.json(await useCase.execute());
  } catch {
    return serverError();
  }
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user?.moderator) return forbidden();

    const parsed = await parseBody(req, BackupCommentsSchema);
    if (!parsed.ok) return parsed.response;

    const useCase = new ImportCommentsUseCase(new MongoCommentRepository());
    const imported = await useCase.execute(parsed.data.comments);
    return NextResponse.json({ imported }, { status: 201 });
  } catch {
    return serverError();
  }
}
