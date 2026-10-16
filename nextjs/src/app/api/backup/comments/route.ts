import { NextResponse } from "next/server";
import { MongoCommentRepository } from "@/infrastructure/repositories/MongoCommentRepository";
import { MongoUserRepository } from "@/infrastructure/repositories/MongoUserRepository";
import { GetAllCommentsUseCase } from "@/application/use-cases/CommentUseCases";
import { ImportCommentsUseCase } from "@/application/use-cases/BackupUseCases";
import { getActiveSessionUser, forbidden, serverError } from "@/lib/get-session";
import { parseBody } from "@/lib/parse-body";
import { logger } from "@/lib/logger";
import { BackupCommentsSchema } from "@/lib/schemas";
import { backupDownload } from "../backupResponse";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getActiveSessionUser();
    if (!user?.moderator) return forbidden();

    const repo = new MongoCommentRepository();
    const useCase = new GetAllCommentsUseCase(repo);
    return backupDownload("comments", await useCase.execute());
  } catch (err) {
    return serverError(err);
  }
}

// Accepts the GET's bare array or `{ comments: [...] }`. Restore users
// first, so authors resolve to their accounts.
export async function POST(req: Request) {
  try {
    const user = await getActiveSessionUser();
    if (!user?.moderator) return forbidden();

    const parsed = await parseBody(req, BackupCommentsSchema);
    if (!parsed.ok) return parsed.response;

    const useCase = new ImportCommentsUseCase({
      comment: new MongoCommentRepository(),
      user: new MongoUserRepository(),
    });
    const report = await useCase.execute(parsed.data.comments);

    logger.info(
      { action: "backup_restore", kind: "comments", moderatorId: user.id, ...report },
      "backup restored",
    );
    // `imported` is the endpoint's former response, kept as an alias.
    return NextResponse.json({ ...report, imported: report.created }, { status: 201 });
  } catch (err) {
    return serverError(err);
  }
}
