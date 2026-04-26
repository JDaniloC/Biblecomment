import { NextResponse } from "next/server";
import { MongoUserRepository } from "@/infrastructure/repositories/MongoUserRepository";
import { RegisterUserUseCase } from "@/application/use-cases/AuthUseCases";
import { UpdateUserProfileUseCase, DeleteUserUseCase } from "@/application/use-cases/UserUseCases";
import { getSessionUser, unauthorized, forbidden, badRequest, serverError } from "@/lib/get-session";
import { UserModel } from "@/infrastructure/database/models/UserModel";
import { CommentModel } from "@/infrastructure/database/models/CommentModel";
import { connectToDatabase } from "@/infrastructure/database/connection";

const PAGE_SIZE = 5;

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
  } catch {
    return serverError();
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { email?: string; username?: string; password?: string };
    const { email, username, password } = body;
    if (!email || !username || !password) {
      return badRequest("Campos obrigatórios: email, username, password");
    }

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
    return serverError();
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const body = (await req.json()) as { state?: string; belief?: string };
    const { state, belief } = body;
    if (!state && !belief) return badRequest("Campos obrigatórios: state ou belief");

    const repo = new MongoUserRepository();
    const useCase = new UpdateUserProfileUseCase(repo);
    const updated = await useCase.execute(user.email, { state, belief });
    const { password: _pw, ...safeUser } = updated;
    return NextResponse.json(safeUser);
  } catch {
    return serverError();
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const body = (await req.json()) as { email?: string };
    const { email } = body;
    if (!email) return badRequest("Campos obrigatórios: email");

    const repo = new MongoUserRepository();
    const useCase = new DeleteUserUseCase(repo);
    await useCase.execute(user.email, email, user.moderator);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return forbidden();
    }
    return serverError();
  }
}
