/**
 * Server-only helper to instantiate the badge evaluator with all its repos
 * pre-wired. Each action that should trigger badge re-evaluation calls
 * `evaluateBadges({ ... })` here — failures are swallowed so the user's
 * primary action never fails because badges blew up.
 */

import { MongoUserRepository } from "@/infrastructure/repositories/MongoUserRepository";
import { MongoUserChapterReadRepository } from "@/infrastructure/repositories/MongoUserChapterReadRepository";
import { MongoCommentRepository } from "@/infrastructure/repositories/MongoCommentRepository";
import { MongoCommentLikeRepository } from "@/infrastructure/repositories/MongoCommentLikeRepository";
import { MongoDiscussionRepository } from "@/infrastructure/repositories/MongoDiscussionRepository";
import { MongoDiscussionAnswerRepository } from "@/infrastructure/repositories/MongoDiscussionAnswerRepository";
import { MongoNotificationRepository } from "@/infrastructure/repositories/MongoNotificationRepository";
import { MongoBookRepository } from "@/infrastructure/repositories/MongoBookRepository";
import { MongoReadingSessionRepository } from "@/infrastructure/repositories/MongoReadingSessionRepository";
import { EvaluateBadgesUseCase, type EvaluateInput } from "@/application/use-cases/BadgeUseCases";
import { logger } from "@/lib/logger";

export async function evaluateBadges(input: EvaluateInput): Promise<string[]> {
  try {
    const useCase = new EvaluateBadgesUseCase({
      user: new MongoUserRepository(),
      chapterRead: new MongoUserChapterReadRepository(),
      comment: new MongoCommentRepository(),
      commentLike: new MongoCommentLikeRepository(),
      discussion: new MongoDiscussionRepository(),
      discussionAnswer: new MongoDiscussionAnswerRepository(),
      notification: new MongoNotificationRepository(),
      book: new MongoBookRepository(),
      readingSession: new MongoReadingSessionRepository(),
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
