"use server";

import { auth } from "@/lib/auth";
import { MongoNotificationRepository } from "@/infrastructure/repositories/MongoNotificationRepository";
import {
  MarkNotificationReadUseCase,
  MarkAllNotificationsReadUseCase,
} from "@/application/use-cases/NotificationUseCases";
import type { Notification } from "@/domain/entities/Notification";
import { logger } from "@/lib/logger";
import type { ActionResult } from "./comments";

function authError(): ActionResult<never> {
  return { ok: false, error: "Unauthorized" };
}

function appError(err: unknown, fallback: string): ActionResult<never> {
  if (err instanceof Error) return { ok: false, error: err.message };
  return { ok: false, error: fallback };
}

/**
 * Mark a single notification as read. Ownership is enforced inside the
 * use case via the recipient match. No revalidation — the bell polls.
 */
export async function markNotificationReadAction(
  notificationId: string,
): Promise<ActionResult<Notification>> {
  const session = await auth();
  if (!session?.user) return authError();

  try {
    const repo = new MongoNotificationRepository();
    const useCase = new MarkNotificationReadUseCase(repo);
    const updated = await useCase.execute(notificationId, session.user.username);
    return { ok: true, data: updated };
  } catch (err) {
    if (err instanceof Error && err.message === "Notification not found") {
      return { ok: false, error: "NotFound" };
    }
    logger.error(
      { err, action: "markNotificationReadAction", notificationId },
      "mark notification failed",
    );
    return appError(err, "Erro ao marcar notificação.");
  }
}

/**
 * Bulk mark every unread notification for the current user as read.
 */
export async function markAllNotificationsReadAction(): Promise<
  ActionResult<{ updated: number }>
> {
  const session = await auth();
  if (!session?.user) return authError();

  try {
    const repo = new MongoNotificationRepository();
    const useCase = new MarkAllNotificationsReadUseCase(repo);
    const updated = await useCase.execute(session.user.username);
    return { ok: true, data: { updated } };
  } catch (err) {
    logger.error({ err, action: "markAllNotificationsReadAction" }, "mark all failed");
    return appError(err, "Erro ao marcar notificações.");
  }
}
