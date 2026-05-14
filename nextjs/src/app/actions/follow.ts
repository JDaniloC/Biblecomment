"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { MongoFollowRepository } from "@/infrastructure/repositories/MongoFollowRepository";
import { MongoUserRepository } from "@/infrastructure/repositories/MongoUserRepository";
import { MongoNotificationRepository } from "@/infrastructure/repositories/MongoNotificationRepository";
import {
  FollowUserUseCase,
  UnfollowUserUseCase,
} from "@/application/use-cases/FollowUseCases";
import { logger } from "@/lib/logger";
import type { ActionResult } from "./comments";

function authError(): ActionResult<never> {
  return { ok: false, error: "Unauthorized" };
}

function appError(err: unknown, fallback: string): ActionResult<never> {
  if (err instanceof Error) return { ok: false, error: err.message };
  return { ok: false, error: fallback };
}

export async function followUserAction(
  targetUsername: string,
): Promise<ActionResult<{ following: true }>> {
  const session = await auth();
  if (!session?.user?.email) return authError();

  try {
    const useCase = new FollowUserUseCase(
      new MongoFollowRepository(),
      new MongoUserRepository(),
      new MongoNotificationRepository(),
    );
    await useCase.execute(session.user.email, targetUsername);
    revalidatePath(`/u/${targetUsername}`, "page");
    return { ok: true, data: { following: true } };
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "Cannot follow yourself") return { ok: false, error: err.message };
      if (err.message === "Target not found") return { ok: false, error: "NotFound" };
    }
    logger.error({ err, action: "followUserAction", targetUsername }, "follow failed");
    return appError(err, "Erro ao seguir usuário.");
  }
}

export async function unfollowUserAction(
  targetUsername: string,
): Promise<ActionResult<{ following: false }>> {
  const session = await auth();
  if (!session?.user?.email) return authError();

  try {
    const useCase = new UnfollowUserUseCase(
      new MongoFollowRepository(),
      new MongoUserRepository(),
    );
    await useCase.execute(session.user.email, targetUsername);
    revalidatePath(`/u/${targetUsername}`, "page");
    return { ok: true, data: { following: false } };
  } catch (err) {
    if (err instanceof Error && err.message === "Target not found") {
      return { ok: false, error: "NotFound" };
    }
    logger.error({ err, action: "unfollowUserAction", targetUsername }, "unfollow failed");
    return appError(err, "Erro ao deixar de seguir.");
  }
}
