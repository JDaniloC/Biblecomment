import { NextResponse } from "next/server";
import { MongoUserRepository } from "@/infrastructure/repositories/MongoUserRepository";
import { ChangePasswordUseCase } from "@/application/use-cases/AuthUseCases";
import { getSessionUser, unauthorized, forbidden, notFound, serverError } from "@/lib/get-session";
import { parseBody } from "@/lib/parse-body";
import { ChangePasswordSchema } from "@/lib/schemas";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const parsed = await parseBody(req, ChangePasswordSchema);
    if (!parsed.ok) return parsed.response;

    const repo = new MongoUserRepository();
    const useCase = new ChangePasswordUseCase(repo);
    await useCase.execute(user.email, parsed.data.currentPassword, parsed.data.newPassword);

    logger.info({ actor: user.email, action: "change_password" }, "password rotated");
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "Invalid current password") return forbidden();
      if (err.message === "User not found") return notFound("User not found");
    }
    return serverError(err);
  }
}
