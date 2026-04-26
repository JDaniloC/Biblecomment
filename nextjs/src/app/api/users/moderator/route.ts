import { NextResponse } from "next/server";
import { MongoUserRepository } from "@/infrastructure/repositories/MongoUserRepository";
import { SetModeratorUseCase } from "@/application/use-cases/UserUseCases";
import { getSessionUser, forbidden, notFound, serverError } from "@/lib/get-session";
import { parseBody } from "@/lib/parse-body";
import { SetModeratorSchema } from "@/lib/schemas";
import { logger } from "@/lib/logger";

export async function PATCH(req: Request) {
  try {
    const actor = await getSessionUser();
    if (!actor?.moderator) return forbidden();

    const parsed = await parseBody(req, SetModeratorSchema);
    if (!parsed.ok) return parsed.response;
    const { email, moderator } = parsed.data;

    const repo = new MongoUserRepository();
    const useCase = new SetModeratorUseCase(repo);
    const updated = await useCase.execute(email, moderator);

    logger.info(
      { actor: actor.email, target: email, moderator, action: "set_moderator" },
      "moderator role changed",
    );

    return NextResponse.json({
      email: updated.email,
      username: updated.username,
      moderator: updated.moderator ?? false,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "User not found") {
      return notFound("User not found");
    }
    return serverError();
  }
}
