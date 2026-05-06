/**
 * Server-only helper to instantiate the badge evaluator with all its repos
 * pre-wired. Each action that should trigger badge re-evaluation calls
 * `evaluateBadges({ ... })` here — failures are swallowed so the user's
 * primary action never fails because badges blew up.
 */

import { MongoUserRepository } from "@/infrastructure/repositories/MongoUserRepository";
import { MongoUserChapterReadRepository } from "@/infrastructure/repositories/MongoUserChapterReadRepository";
import { MongoCommentRepository } from "@/infrastructure/repositories/MongoCommentRepository";
import { MongoDiscussionRepository } from "@/infrastructure/repositories/MongoDiscussionRepository";
import { MongoNotificationRepository } from "@/infrastructure/repositories/MongoNotificationRepository";
import { MongoBookRepository } from "@/infrastructure/repositories/MongoBookRepository";
import { EvaluateBadgesUseCase, type EvaluateInput } from "@/application/use-cases/BadgeUseCases";
import { logger } from "@/lib/logger";

export async function evaluateBadges(input: EvaluateInput): Promise<string[]> {
  try {
    const useCase = new EvaluateBadgesUseCase({
      user: new MongoUserRepository(),
      chapterRead: new MongoUserChapterReadRepository(),
      comment: new MongoCommentRepository(),
      discussion: new MongoDiscussionRepository(),
      notification: new MongoNotificationRepository(),
      book: new MongoBookRepository(),
    });
    return await useCase.evaluate(input);
  } catch (err) {
    logger.error(
      { err, userId: input.userId, axes: input.axes, action: "evaluateBadges" },
      "badge evaluator failed; user action continues unaffected",
    );
    return [];
  }
}
