"use server";

import { revalidatePath } from "next/cache";
import { auth, reestablishSession } from "@/lib/auth";
import { getActiveSessionUser } from "@/lib/get-session";
import { MongoUserRepository } from "@/infrastructure/repositories/MongoUserRepository";
import { MongoCommentRepository } from "@/infrastructure/repositories/MongoCommentRepository";
import { MongoPasswordResetTokenRepository } from "@/infrastructure/repositories/MongoPasswordResetTokenRepository";
import {
	UpdateUserProfileUseCase,
	SetModeratorUseCase,
	SetUserDisabledUseCase,
	MarkTutorialCompletedUseCase,
	DeletionIncompleteError,
} from "@/application/use-cases/UserUseCases";
import { ChangePasswordUseCase } from "@/application/use-cases/AuthUseCases";
import { forgetSessionUser } from "@/lib/session-revalidation";
import { UpdateProfileSchema } from "@/lib/schemas";
import { logger } from "@/lib/logger";
import { makeDeleteUserUseCase, makeUpdateUsernameUseCase } from "./_account";
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
export async function updateProfileAction(updates: {
	belief?: string;
	state?: string;
	displayName?: string;
	showBelief?: boolean;
}): Promise<ActionResult<{ updated: true }>> {
	const session = await auth();
	if (!session?.user) return authError();
	// Server actions take arbitrary client input: validate the shape (and
	// drop unknown keys) before it gets anywhere near the user document.
	const parsed = UpdateProfileSchema.safeParse(updates);
	if (!parsed.success) return { ok: false, error: "Invalid profile data" };

	try {
		const repo = new MongoUserRepository();
		const useCase = new UpdateUserProfileUseCase(repo);
		await useCase.execute(session.user.email, parsed.data);
		revalidatePath("/profile", "page");
		return { ok: true, data: { updated: true } };
	} catch (err) {
		if (err instanceof Error) {
			if (err.message === "User not found")
				return { ok: false, error: "NotFound" };
			if (err.message === "Invalid displayName length")
				return { ok: false, error: err.message };
		}
		logger.error(
			{ err, action: "updateProfileAction" },
			"update profile failed",
		);
		return appError(err, "Erro ao atualizar perfil.");
	}
}

/**
 * Rename the current user's slug + cascade across content collections.
 * Validation surface: format, uniqueness, "no-op when unchanged". The cascade
 * runs after the user write commits — see UpdateUsernameUseCase for the
 * idempotency contract.
 */
export async function updateUsernameAction(
	newUsername: string,
): Promise<ActionResult<{ username: string }>> {
	// Account-level write: revalidated against the DB, not the session cache.
	const user = await getActiveSessionUser();
	if (!user) return authError();

	try {
		const updated = await makeUpdateUsernameUseCase().execute(
			user.email,
			newUsername,
		);
		if (updated._id) forgetSessionUser(updated._id);
		revalidatePath("/profile", "page");
		return { ok: true, data: { username: updated.username } };
	} catch (err) {
		if (err instanceof Error) {
			if (err.message === "Invalid username format")
				return { ok: false, error: err.message };
			if (err.message === "Username already taken")
				return { ok: false, error: err.message };
			if (err.message === "User not found")
				return { ok: false, error: "NotFound" };
		}
		logger.error({ err, action: "updateUsernameAction" }, "rename failed");
		return appError(err, "Erro ao atualizar nome de usuário.");
	}
}

/**
 * Delete the current user's own account. Replaces axios.delete(/api/users)
 * with body { email }. Self-only: deleting someone else goes through
 * `deleteUserAction`, which is moderator-gated and audit-logged.
 *
 * `pending` means the account is marked (and already locked) but the
 * cascade didn't finish; the account-maintenance cron completes it.
 */
export async function deleteSelfAction(
	email: string,
): Promise<ActionResult<{ deleted: true; pending?: true }>> {
	// Account-level write: revalidated against the DB, not the session cache.
	const user = await getActiveSessionUser();
	if (!user) return authError();
	if (email !== user.email) return { ok: false, error: "Forbidden" };

	try {
		await makeDeleteUserUseCase().execute(email, email, false);
		revalidatePath("/profile", "page");
		return { ok: true, data: { deleted: true } };
	} catch (err) {
		if (err instanceof DeletionIncompleteError) {
			logger.warn(
				{ err: err.cause, userId: err.userId, action: "deleteSelfAction" },
				"account deletion incomplete; left to the account-maintenance cron",
			);
			return { ok: true, data: { deleted: true, pending: true } };
		}
		if (err instanceof Error) {
			if (err.message === "Unauthorized")
				return { ok: false, error: "Forbidden" };
			if (err.message === "User not found")
				return { ok: false, error: "NotFound" };
		}
		logger.error({ err, action: "deleteSelfAction" }, "delete user failed");
		return appError(err, "Erro ao excluir usuário.");
	}
}

/**
 * Delete another user. Moderator-only — distinct from `deleteSelfAction` so
 * the moderation action is audit-logged and gated on the mod flag.
 */
export async function deleteUserAction(
	email: string,
): Promise<ActionResult<{ deleted: true; pending?: true }>> {
	// Fresh read: a revoked or demoted moderator's cached session must not
	// keep moderating for the cache TTL.
	const actor = await getActiveSessionUser();
	if (!actor) return authError();
	if (!actor.moderator) return { ok: false, error: "Forbidden" };

	let pending = false;
	try {
		try {
			await makeDeleteUserUseCase().execute(actor.email, email, true);
		} catch (err) {
			if (!(err instanceof DeletionIncompleteError)) throw err;
			logger.warn(
				{ err: err.cause, userId: err.userId, action: "deleteUserAction" },
				"account deletion incomplete; left to the account-maintenance cron",
			);
			pending = true;
		}

		logger.info(
			{ actor: actor.email, target: email, pending, action: "delete_user" },
			"user deleted by moderator",
		);

		revalidatePath("/admin/moderation", "page");
		return {
			ok: true,
			data: pending ? { deleted: true, pending: true } : { deleted: true },
		};
	} catch (err) {
		if (err instanceof Error) {
			if (err.message === "Unauthorized")
				return { ok: false, error: "Forbidden" };
			if (err.message === "User not found")
				return { ok: false, error: "NotFound" };
		}
		logger.error(
			{ err, action: "deleteUserAction", target: email },
			"delete user failed",
		);
		return appError(err, "Erro ao excluir usuário.");
	}
}

/**
 * Disable / re-enable an account. Moderator-only. Disabling blocks new
 * logins and cascade-hides the user's comments; re-enabling reverses both.
 */
export async function setUserDisabledAction(
	email: string,
	disabled: boolean,
): Promise<
	ActionResult<{ email: string; username: string; disabled: boolean }>
> {
	// Fresh read: a revoked or demoted moderator's cached session must not
	// keep moderating for the cache TTL.
	const actor = await getActiveSessionUser();
	if (!actor) return authError();
	if (!actor.moderator) return { ok: false, error: "Forbidden" };

	try {
		const useCase = new SetUserDisabledUseCase(
			new MongoUserRepository(),
			new MongoCommentRepository(),
		);
		const updated = await useCase.execute(
			email,
			disabled,
			actor.username,
		);
		if (updated._id) forgetSessionUser(updated._id);

		logger.info(
			{
				actor: actor.email,
				target: email,
				disabled,
				action: "set_user_disabled",
			},
			"user disabled state changed",
		);

		revalidatePath("/admin/moderation", "page");
		return {
			ok: true,
			data: {
				email: updated.email,
				username: updated.username,
				disabled: Boolean(updated.disabledAt),
			},
		};
	} catch (err) {
		if (err instanceof Error && err.message === "User not found") {
			return { ok: false, error: "NotFound" };
		}
		logger.error(
			{ err, action: "setUserDisabledAction", target: email },
			"set user disabled failed",
		);
		return appError(err, "Erro ao atualizar status da conta.");
	}
}

/**
 * Rotate the current user's password. Mirrors POST /api/users/me/password —
 * server-side enforces min-6-char and current !== new.
 *
 * The change revokes every session of the account (sessionVersion bump);
 * this browser is then signed in again with the new password, so only the
 * other devices are signed out. `sessionKept: false` means that re-sign-in
 * failed and the client must send the user to /login.
 */
export async function changePasswordAction(
	currentPassword: string,
	newPassword: string,
): Promise<ActionResult<{ success: true; sessionKept: boolean }>> {
	// Account-level write: a session revoked on another instance (whose
	// cache may still serve it) is refused here at once.
	const user = await getActiveSessionUser();
	if (!user) return authError();

	if (!newPassword || newPassword.length < 6) {
		return { ok: false, error: "Senha inválida (mínimo 6 caracteres)." };
	}
	if (currentPassword === newPassword) {
		return { ok: false, error: "A nova senha deve ser diferente da atual." };
	}

	try {
		const useCase = new ChangePasswordUseCase(new MongoUserRepository(), {
			passwordReset: new MongoPasswordResetTokenRepository(),
		});
		const { userId, cleanupError } = await useCase.execute(
			user.email,
			currentPassword,
			newPassword,
		);
		// Also drops a pre-bump lookup in flight on this instance, so it
		// can't be cached over the new version.
		forgetSessionUser(userId);
		const sessionKept = await reestablishSession(user.email, newPassword);
		logger.info(
			{
				actor: user.email,
				userId,
				sessionKept,
				action: "change_password",
			},
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
				"password changed but this device could not be signed in again",
			);
		}
		revalidatePath("/profile", "page");
		return { ok: true, data: { success: true, sessionKept } };
	} catch (err) {
		if (err instanceof Error) {
			if (err.message === "Invalid current password")
				return { ok: false, error: "Forbidden" };
			if (err.message === "Unauthorized")
				return { ok: false, error: "Forbidden" };
			if (err.message === "User not found")
				return { ok: false, error: "NotFound" };
		}
		logger.error(
			{ err, action: "changePasswordAction" },
			"change password failed",
		);
		return appError(err, "Erro ao atualizar senha.");
	}
}

/**
 * Mark an onboarding tutorial as completed for the current user. Idempotent
 * via $addToSet at the repo layer. Server-side persistence is what makes
 * the tour cross-device — the localStorage flag still drives "skip on this
 * device" but the server flag is loaded into the JWT at next login.
 */
export async function markTutorialCompletedAction(
	name: string,
): Promise<ActionResult<{ marked: true }>> {
	const session = await auth();
	if (!session?.user) return authError();

	try {
		const useCase = new MarkTutorialCompletedUseCase(new MongoUserRepository());
		await useCase.execute(session.user.email, name);
		return { ok: true, data: { marked: true } };
	} catch (err) {
		if (err instanceof Error && err.message === "Invalid tutorial name") {
			return { ok: false, error: "Invalid tutorial name" };
		}
		logger.error(
			{ err, action: "markTutorialCompletedAction", name },
			"mark tutorial failed",
		);
		return appError(err, "Erro ao marcar tutorial como concluído.");
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
	// Fresh read: a revoked or demoted moderator's cached session must not
	// keep moderating for the cache TTL.
	const actor = await getActiveSessionUser();
	if (!actor) return authError();
	if (!actor.moderator) return { ok: false, error: "Forbidden" };

	try {
		const repo = new MongoUserRepository();
		const useCase = new SetModeratorUseCase(repo);
		const updated = await useCase.execute(email, moderator);
		if (updated._id) forgetSessionUser(updated._id);

		logger.info(
			{
				actor: actor.email,
				target: email,
				moderator,
				action: "set_moderator",
			},
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
		logger.error(
			{ err, action: "setModeratorAction", target: email },
			"set moderator failed",
		);
		return appError(err, "Erro ao atualizar moderador.");
	}
}
