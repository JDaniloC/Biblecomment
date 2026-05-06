"use server";

import { auth } from "@/lib/auth";
import { MongoUserRepository } from "@/infrastructure/repositories/MongoUserRepository";
import { MongoUserChapterReadRepository } from "@/infrastructure/repositories/MongoUserChapterReadRepository";
import { MongoCommentRepository } from "@/infrastructure/repositories/MongoCommentRepository";
import { MongoCommentLikeRepository } from "@/infrastructure/repositories/MongoCommentLikeRepository";
import { MongoDiscussionRepository } from "@/infrastructure/repositories/MongoDiscussionRepository";
import { MongoNotificationRepository } from "@/infrastructure/repositories/MongoNotificationRepository";
import { MongoBookRepository } from "@/infrastructure/repositories/MongoBookRepository";
import {
  EvaluateBadgesUseCase,
  GetUserBadgesUseCase,
  type UserBadgesView,
} from "@/application/use-cases/BadgeUseCases";
import { logger } from "@/lib/logger";
import type { ActionResult } from "./comments";

function authError(): ActionResult<never> {
  return { ok: false, error: "Unauthorized" };
}

export async function getMyBadgesAction(): Promise<ActionResult<UserBadgesView>> {
  const session = await auth();
  if (!session?.user) return authError();

  try {
    const evaluator = new EvaluateBadgesUseCase({
      user: new MongoUserRepository(),
      chapterRead: new MongoUserChapterReadRepository(),
      comment: new MongoCommentRepository(),
      commentLike: new MongoCommentLikeRepository(),
      discussion: new MongoDiscussionRepository(),
      notification: new MongoNotificationRepository(),
      book: new MongoBookRepository(),
    });
    const useCase = new GetUserBadgesUseCase(new MongoUserRepository(), evaluator);
    const view = await useCase.execute(
      session.user.email!,
      session.user.username,
      session.user.id,
    );
    return { ok: true, data: view };
  } catch (err) {
    logger.error({ err, action: "getMyBadgesAction" }, "get badges failed");
    return { ok: false, error: "Erro ao carregar conquistas." };
  }
}
