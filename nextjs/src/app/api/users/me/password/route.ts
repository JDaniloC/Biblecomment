import { NextResponse } from "next/server";
import { MongoUserRepository } from "@/infrastructure/repositories/MongoUserRepository";
import { MongoPasswordResetTokenRepository } from "@/infrastructure/repositories/MongoPasswordResetTokenRepository";
import { ChangePasswordUseCase } from "@/application/use-cases/AuthUseCases";
import {
  getActiveSessionUser,
  unauthorized,
  forbidden,
  notFound,
  serverError,
} from "@/lib/get-session";
import { reestablishSession } from "@/lib/auth";
import { forgetSessionUser } from "@/lib/session-revalidation";
import { parseBody } from "@/lib/parse-body";
import { ChangePasswordSchema } from "@/lib/schemas";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * Same flow as changePasswordAction: the change revokes every session of the
 * account, then this client is signed in again with the new password (the
 * new session cookie rides on this response). `sessionKept: false` means
 * that re-sign-in failed and the client has to log in again.
 */
export async function POST(req: Request) {
  try {
    // Re-checked against the DB, like changePasswordAction.
    const user = await getActiveSessionUser();
    if (!user) return unauthorized();

    const parsed = await parseBody(req, ChangePasswordSchema);
    if (!parsed.ok) return parsed.response;

    const useCase = new ChangePasswordUseCase(new MongoUserRepository(), {
      passwordReset: new MongoPasswordResetTokenRepository(),
    });
    const { userId, cleanupError } = await useCase.execute(
      user.email,
      parsed.data.currentPassword,
      parsed.data.newPassword,
    );
    forgetSessionUser(userId);
    const sessionKept = await reestablishSession(user.email, parsed.data.newPassword);

    logger.info(
      { actor: user.email, userId, sessionKept, action: "change_password" },
      "password rotated; other sessions revoked",
    );
    if (cleanupError !== undefined) {
      logger.error(
        { err: cleanupError, userId, action: "change_password" },
        "password changed but its reset links or pending e-mail change could not be revoked",
      );
    }
    if (!sessionKept) {
      logger.warn(
        { userId, action: "change_password" },
        "password changed but this client could not be signed in again",
      );
    }
    return NextResponse.json({ success: true, sessionKept });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "Invalid current password") return forbidden();
      if (err.message === "Unauthorized") return forbidden();
      if (err.message === "User not found") return notFound("User not found");
    }
    return serverError(err);
  }
}
