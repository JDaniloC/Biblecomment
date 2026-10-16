import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { MongoUserRepository } from "@/infrastructure/repositories/MongoUserRepository";
import { MongoAccountErasureRepository } from "@/infrastructure/repositories/MongoAccountErasureRepository";
import { MongoPushSubscriptionRepository } from "@/infrastructure/repositories/MongoPushSubscriptionRepository";
import { MongoReadingReminderPreferenceRepository } from "@/infrastructure/repositories/MongoReadingReminderPreferenceRepository";
import { MongoNotificationRepository } from "@/infrastructure/repositories/MongoNotificationRepository";
import {
  BackupUsersUseCase,
  RestoreUsersUseCase,
} from "@/application/use-cases/BackupUseCases";
import { getActiveSessionUser, forbidden, serverError } from "@/lib/get-session";
import { parseBody } from "@/lib/parse-body";
import { logger } from "@/lib/logger";
import { BackupUsersSchema } from "@/lib/schemas";
import { backupDownload } from "../backupResponse";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getActiveSessionUser();
    if (!user?.moderator) return forbidden();

    const useCase = new BackupUsersUseCase(new MongoUserRepository());
    return backupDownload("users", await useCase.execute());
  } catch (err) {
    return serverError(err);
  }
}

// Accepts the GET's bare array or `{ users: [...] }`. Restore tombstones
// (/api/backup/erasures) first, so erased accounts are recognized.
export async function POST(req: Request) {
  try {
    const user = await getActiveSessionUser();
    if (!user?.moderator) return forbidden();

    const parsed = await parseBody(req, BackupUsersSchema);
    if (!parsed.ok) return parsed.response;

    const useCase = new RestoreUsersUseCase({
      user: new MongoUserRepository(),
      erasures: new MongoAccountErasureRepository(),
      usernameKeyed: {
        pushSubscription: new MongoPushSubscriptionRepository(),
        readingReminder: new MongoReadingReminderPreferenceRepository(),
        notification: new MongoNotificationRepository(),
      },
      // The preimage is discarded, so nobody can sign in with it: the owner
      // regains access through password recovery.
      placeholderHash: () => bcrypt.hash(randomBytes(32).toString("base64"), 12),
    });
    const report = await useCase.execute(parsed.data.users);

    // Counts only, never e-mails: the record of who restored what.
    logger.info(
      {
        action: "backup_restore",
        kind: "users",
        moderatorId: user.id,
        received: report.received,
        created: report.created,
        skipped: report.skipped,
      },
      "backup restored",
    );
    return NextResponse.json(report, { status: 201 });
  } catch (err) {
    return serverError(err);
  }
}
