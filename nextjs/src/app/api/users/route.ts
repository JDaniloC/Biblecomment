import { NextResponse } from "next/server";
import { MongoUserRepository } from "@/infrastructure/repositories/MongoUserRepository";
import { MongoCommentRepository } from "@/infrastructure/repositories/MongoCommentRepository";
import { MongoCommentLikeRepository } from "@/infrastructure/repositories/MongoCommentLikeRepository";
import { MongoCommentReportRepository } from "@/infrastructure/repositories/MongoCommentReportRepository";
import { MongoDiscussionRepository } from "@/infrastructure/repositories/MongoDiscussionRepository";
import { MongoNotificationRepository } from "@/infrastructure/repositories/MongoNotificationRepository";
import { RegisterUserUseCase } from "@/application/use-cases/AuthUseCases";
import { UpdateUserProfileUseCase, DeleteUserUseCase } from "@/application/use-cases/UserUseCases";
import { getSessionUser, unauthorized, forbidden, serverError } from "@/lib/get-session";
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

    const users = await UserModel.find({})
      .sort({ createdAt: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .lean();

    const usernames = users.map((u) => u.username);
    const counts = await CommentModel.aggregate([
      { $match: { username: { $in: usernames } } },
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
      belief: u.belief,
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
    const { email, username, password } = parsed.data;

    const repo = new MongoUserRepository();
    const useCase = new RegisterUserUseCase(repo);
    const user = await useCase.execute(email, username, password);
    return NextResponse.json({ email: user.email, username: user.username }, { status: 201 });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "Email already registered" || err.message === "Username already taken") {
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

    const useCase = new DeleteUserUseCase(
      new MongoUserRepository(),
      new MongoCommentRepository(),
      new MongoCommentLikeRepository(),
      new MongoCommentReportRepository(),
      new MongoDiscussionRepository(),
      new MongoNotificationRepository(),
    );
    await useCase.execute(user.email, parsed.data.email, user.moderator);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return forbidden();
    }
    return serverError(err);
  }
}
