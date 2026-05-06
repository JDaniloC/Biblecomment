"use server";

import { auth } from "@/lib/auth";
import { MongoUserRepository } from "@/infrastructure/repositories/MongoUserRepository";
import { GetUserBadgesUseCase, type UserBadgesView } from "@/application/use-cases/BadgeUseCases";
import { logger } from "@/lib/logger";
import type { ActionResult } from "./comments";

function authError(): ActionResult<never> {
  return { ok: false, error: "Unauthorized" };
}

export async function getMyBadgesAction(): Promise<ActionResult<UserBadgesView>> {
  const session = await auth();
  if (!session?.user) return authError();

  try {
    const useCase = new GetUserBadgesUseCase(new MongoUserRepository());
    const view = await useCase.execute(session.user.email!);
    return { ok: true, data: view };
  } catch (err) {
    logger.error({ err, action: "getMyBadgesAction" }, "get badges failed");
    return { ok: false, error: "Erro ao carregar conquistas." };
  }
}
