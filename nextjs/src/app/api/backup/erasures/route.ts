import { NextResponse } from "next/server";
import { MongoAccountErasureRepository } from "@/infrastructure/repositories/MongoAccountErasureRepository";
import {
  BackupErasuresUseCase,
  RestoreErasuresUseCase,
} from "@/application/use-cases/BackupUseCases";
import { getActiveSessionUser, forbidden, serverError } from "@/lib/get-session";
import { parseBody } from "@/lib/parse-body";
import { logger } from "@/lib/logger";
import { BackupErasuresSchema } from "@/lib/schemas";
import { backupDownload } from "../backupResponse";

export const dynamic = "force-dynamic";

// Deletion tombstones ({ userId, erasedAt }): the ids of deleted accounts,
// which the users restore skips. They live in the same database, so they
// are exported with every backup and restored before anything else.
export async function GET() {
  try {
    const user = await getActiveSessionUser();
    if (!user?.moderator) return forbidden();

    const useCase = new BackupErasuresUseCase(new MongoAccountErasureRepository());
    return backupDownload("erasures", await useCase.execute());
  } catch (err) {
    return serverError(err);
  }
}

// Accepts the GET's bare array or `{ erasures: [...] }`. Idempotent: a
// tombstone already recorded keeps the later of the two dates.
export async function POST(req: Request) {
  try {
    const user = await getActiveSessionUser();
    if (!user?.moderator) return forbidden();

    const parsed = await parseBody(req, BackupErasuresSchema);
    if (!parsed.ok) return parsed.response;

    const useCase = new RestoreErasuresUseCase(new MongoAccountErasureRepository());
    const report = await useCase.execute(parsed.data.erasures);

    logger.info(
      { action: "backup_restore", kind: "erasures", moderatorId: user.id, ...report },
      "backup restored",
    );
    return NextResponse.json(report, { status: 201 });
  } catch (err) {
    return serverError(err);
  }
}
