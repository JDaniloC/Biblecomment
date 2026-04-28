"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { MongoUserRepository } from "@/infrastructure/repositories/MongoUserRepository";
import {
  UpdateUserProfileUseCase,
  DeleteUserUseCase,
  SetModeratorUseCase,
} from "@/application/use-cases/UserUseCases";
import { ChangePasswordUseCase } from "@/application/use-cases/AuthUseCases";
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
 * Update the current user's profile. Replaces axios.patch(/api/users).
 */
export async function updateProfileAction(
  updates: { belief?: string; state?: string },
): Promise<ActionResult<{ updated: true }>> {
  const session = await auth();
  if (!session?.user) return authError();

  try {
    const repo = new MongoUserRepository();
    const useCase = new UpdateUserProfileUseCase(repo);
    await useCase.execute(session.user.email, updates);
    revalidatePath("/profile", "page");
    return { ok: true, data: { updated: true } };
  } catch (err) {
    if (err instanceof Error && err.message === "User not found") {
      return { ok: false, error: "NotFound" };
    }
    logger.error({ err, action: "updateProfileAction" }, "update profile failed");
    return appError(err, "Erro ao atualizar perfil.");
  }
}

/**
 * Delete the current user (or another user, if the actor is a moderator).
 * Replaces axios.delete(/api/users) with body { email }.
 */
export async function deleteSelfAction(
  email: string,
): Promise<ActionResult<{ deleted: true }>> {
  const session = await auth();
  if (!session?.user) return authError();

  try {
    const repo = new MongoUserRepository();
    const useCase = new DeleteUserUseCase(repo);
    await useCase.execute(session.user.email, email, session.user.moderator);
    revalidatePath("/profile", "page");
    return { ok: true, data: { deleted: true } };
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "Unauthorized") return { ok: false, error: "Forbidden" };
      if (err.message === "User not found") return { ok: false, error: "NotFound" };
    }
    logger.error({ err, action: "deleteSelfAction" }, "delete user failed");
    return appError(err, "Erro ao excluir usuário.");
  }
}

/**
 * Rotate the current user's password. Mirrors POST /api/users/me/password —
 * server-side enforces min-6-char and current !== new.
 */
export async function changePasswordAction(
  currentPassword: string,
  newPassword: string,
): Promise<ActionResult<{ success: true }>> {
  const session = await auth();
  if (!session?.user) return authError();

  if (!newPassword || newPassword.length < 6) {
    return { ok: false, error: "Senha inválida (mínimo 6 caracteres)." };
  }
  if (currentPassword === newPassword) {
    return { ok: false, error: "A nova senha deve ser diferente da atual." };
  }

  try {
    const repo = new MongoUserRepository();
    const useCase = new ChangePasswordUseCase(repo);
    await useCase.execute(session.user.email, currentPassword, newPassword);
    logger.info({ actor: session.user.email, action: "change_password" }, "password rotated");
    revalidatePath("/profile", "page");
    return { ok: true, data: { success: true } };
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "Invalid current password") return { ok: false, error: "Forbidden" };
      if (err.message === "User not found") return { ok: false, error: "NotFound" };
    }
    logger.error({ err, action: "changePasswordAction" }, "change password failed");
    return appError(err, "Erro ao atualizar senha.");
  }
}

/**
 * Promote/demote a user. Moderator-only.
 */
export async function setModeratorAction(
  email: string,
  moderator: boolean,
): Promise<
  ActionResult<{ email: string; username: string; moderator: boolean }>
> {
  const session = await auth();
  if (!session?.user) return authError();
  if (!session.user.moderator) return { ok: false, error: "Forbidden" };

  try {
    const repo = new MongoUserRepository();
    const useCase = new SetModeratorUseCase(repo);
    const updated = await useCase.execute(email, moderator);

    logger.info(
      { actor: session.user.email, target: email, moderator, action: "set_moderator" },
      "moderator role changed",
    );

    return {
      ok: true,
      data: {
        email: updated.email,
        username: updated.username,
        moderator: updated.moderator ?? false,
      },
    };
  } catch (err) {
    if (err instanceof Error && err.message === "User not found") {
      return { ok: false, error: "NotFound" };
    }
    logger.error({ err, action: "setModeratorAction", target: email }, "set moderator failed");
    return appError(err, "Erro ao atualizar moderador.");
  }
}
