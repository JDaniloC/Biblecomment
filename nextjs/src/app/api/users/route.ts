import { NextResponse } from "next/server";
import { MongoUserRepository } from "@/infrastructure/repositories/MongoUserRepository";
import { MongoPushSubscriptionRepository } from "@/infrastructure/repositories/MongoPushSubscriptionRepository";
import { MongoReadingReminderPreferenceRepository } from "@/infrastructure/repositories/MongoReadingReminderPreferenceRepository";
import { MongoNotificationRepository } from "@/infrastructure/repositories/MongoNotificationRepository";
import { RegisterUserUseCase } from "@/application/use-cases/AuthUseCases";
import { UpdateUserProfileUseCase } from "@/application/use-cases/UserUseCases";
import { makeDeleteUserUseCase } from "@/app/actions/_account";
import { DeletionIncompleteError } from "@/application/use-cases/UserUseCases";
import { logger } from "@/lib/logger";
import {
	getSessionUser,
	unauthorized,
	forbidden,
	serverError,
} from "@/lib/get-session";
import { UserModel } from "@/infrastructure/database/models/UserModel";
import { CommentModel } from "@/infrastructure/database/models/CommentModel";
import { connectToDatabase } from "@/infrastructure/database/connection";
import { parseBody } from "@/lib/parse-body";
import {
	RegisterUserSchema,
	UpdateProfileSchema,
	DeleteUserSchema,
} from "@/lib/schemas";

const PAGE_SIZE = 5;

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
	try {
		const sessionUser = await getSessionUser();
		if (!sessionUser) return unauthorized();

		const { searchParams } = new URL(req.url);
		const page = parseInt(searchParams.get("pages") ?? "1", 10);

		await connectToDatabase();

		// Accounts being deleted are already gone as far as others can tell.
		const users = await UserModel.find({ deletion: { $exists: false } })
			.sort({ createdAt: -1 })
			.skip((page - 1) * PAGE_SIZE)
			.limit(PAGE_SIZE)
			.lean();

		const usernames = users.map((u) => u.username);
		const counts = await CommentModel.aggregate([
			// Public directory count — exclude soft-hidden comments.
			{ $match: { username: { $in: usernames }, hiddenAt: null } },
			{ $group: { _id: "$username", total: { $sum: 1 } } },
		]);
		const countMap: Record<string, number> = {};
		for (const c of counts) {
			countMap[c._id as string] = c.total as number;
		}

		const includeEmail = sessionUser.moderator === true;
		const result = users.map((u) => ({
			...(includeEmail ? { email: u.email } : {}),
			username: u.username,
			state: u.state,
			// Religious belief is sensitive data (LGPD Art. 11): only shown when
			// the user opted in, same as the public profile.
			belief: u.showBelief ? u.belief : undefined,
			total_comments: countMap[u.username] ?? 0,
		}));

		return NextResponse.json(result);
	} catch (err) {
		return serverError(err);
	}
}

export async function POST(req: Request) {
	try {
		const parsed = await parseBody(req, RegisterUserSchema);
		if (!parsed.ok) return parsed.response;
		const { email, displayName, username, password } = parsed.data;

		const repo = new MongoUserRepository();
		const useCase = new RegisterUserUseCase(repo, {
			pushSubscription: new MongoPushSubscriptionRepository(),
			readingReminder: new MongoReadingReminderPreferenceRepository(),
			notification: new MongoNotificationRepository(),
		});
		const user = await useCase.execute({
			email,
			displayName,
			username,
			password,
		});
		return NextResponse.json(
			{
				email: user.email,
				username: user.username,
				displayName: user.displayName,
			},
			{ status: 201 },
		);
	} catch (err) {
		if (err instanceof Error) {
			if (
				err.message === "Email already registered" ||
				err.message === "Username already taken" ||
				err.message === "Invalid username format" ||
				err.message === "Could not derive a username from the given name"
			) {
				return NextResponse.json({ error: err.message }, { status: 409 });
			}
		}
		return serverError(err);
	}
}

export async function PATCH(req: Request) {
	try {
		const user = await getSessionUser();
		if (!user) return unauthorized();

		const parsed = await parseBody(req, UpdateProfileSchema);
		if (!parsed.ok) return parsed.response;

		const repo = new MongoUserRepository();
		const useCase = new UpdateUserProfileUseCase(repo);
		const updated = await useCase.execute(user.email, parsed.data);
		const { password: _pw, ...safeUser } = updated;
		return NextResponse.json(safeUser);
	} catch (err) {
		return serverError(err);
	}
}

export async function DELETE(req: Request) {
	try {
		const user = await getSessionUser();
		if (!user) return unauthorized();

		const parsed = await parseBody(req, DeleteUserSchema);
		if (!parsed.ok) return parsed.response;

		const target = parsed.data.email;
		try {
			await makeDeleteUserUseCase().execute(user.email, target, user.moderator);
		} catch (err) {
			// Marked but not finished: the account is already locked and the
			// account-maintenance cron completes the cascade.
			if (!(err instanceof DeletionIncompleteError)) throw err;
			logger.warn(
				{ err: err.cause, userId: err.userId, action: "delete_user" },
				"account deletion incomplete; left to the account-maintenance cron",
			);
			if (target !== user.email) {
				logger.info(
					{ actor: user.email, target, pending: true, action: "delete_user" },
					"user deleted by moderator",
				);
			}
			return NextResponse.json({ success: true, pending: true }, { status: 202 });
		}
		if (target !== user.email) {
			logger.info(
				{ actor: user.email, target, action: "delete_user" },
				"user deleted by moderator",
			);
		}
		return NextResponse.json({ success: true });
	} catch (err) {
		if (err instanceof Error && err.message === "Unauthorized") {
			return forbidden();
		}
		if (err instanceof Error && err.message === "User not found") {
			return NextResponse.json({ error: "Not found" }, { status: 404 });
		}
		return serverError(err);
	}
}
