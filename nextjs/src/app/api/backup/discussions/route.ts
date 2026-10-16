import { NextResponse } from "next/server";
import { MongoDiscussionRepository } from "@/infrastructure/repositories/MongoDiscussionRepository";
import { MongoUserRepository } from "@/infrastructure/repositories/MongoUserRepository";
import {
  BackupDiscussionsUseCase,
  ImportDiscussionsUseCase,
} from "@/application/use-cases/BackupUseCases";
import { getActiveSessionUser, forbidden, serverError } from "@/lib/get-session";
import { parseBody } from "@/lib/parse-body";
import { logger } from "@/lib/logger";
import { BackupDiscussionsSchema } from "@/lib/schemas";
import { backupDownload } from "../backupResponse";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getActiveSessionUser();
    if (!user?.moderator) return forbidden();

    const repo = new MongoDiscussionRepository();
    const useCase = new BackupDiscussionsUseCase(repo);
    return backupDownload("discussions", await useCase.execute());
  } catch (err) {
    return serverError(err);
  }
}

// Accepts the GET's bare array or `{ discussions: [...] }`. Restore
// comments first, so `commentId` links point at the restored comments.
export async function POST(req: Request) {
  try {
    const user = await getActiveSessionUser();
    if (!user?.moderator) return forbidden();

    const parsed = await parseBody(req, BackupDiscussionsSchema);
    if (!parsed.ok) return parsed.response;

    const useCase = new ImportDiscussionsUseCase({
      discussion: new MongoDiscussionRepository(),
      user: new MongoUserRepository(),
    });
    const report = await useCase.execute(parsed.data.discussions);

    logger.info(
      { action: "backup_restore", kind: "discussions", moderatorId: user.id, ...report },
      "backup restored",
    );
    // `imported` is the endpoint's former response, kept as an alias.
    return NextResponse.json({ ...report, imported: report.created }, { status: 201 });
  } catch (err) {
    return serverError(err);
  }
}
