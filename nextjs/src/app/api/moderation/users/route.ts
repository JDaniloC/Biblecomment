import { NextResponse } from "next/server";
import { MongoUserRepository } from "@/infrastructure/repositories/MongoUserRepository";
import { MongoCommentRepository } from "@/infrastructure/repositories/MongoCommentRepository";
import {
  ListUsersForModerationUseCase,
  SetUserDisabledUseCase,
} from "@/application/use-cases/UserUseCases";
import {
  getSessionUser,
  forbidden,
  badRequest,
  notFound,
  serverError,
} from "@/lib/get-session";
import { parseBody } from "@/lib/parse-body";
import { SetUserDisabledSchema } from "@/lib/schemas";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user?.moderator) return forbidden();

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() || undefined;
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(
        1,
        parseInt(
          searchParams.get("limit") ?? String(DEFAULT_LIMIT),
          10,
        ) || DEFAULT_LIMIT,
      ),
    );

    const cursorAt = searchParams.get("cursorAt");
    const cursorId = searchParams.get("cursorId");
    let cursor: { createdAt: Date; id: string } | null = null;
    if (cursorAt && cursorId) {
      const d = new Date(cursorAt);
      if (isNaN(d.getTime())) return badRequest("Invalid cursorAt");
      cursor = { createdAt: d, id: cursorId };
    }

    const useCase = new ListUsersForModerationUseCase(new MongoUserRepository());
    const { items, nextCursor } = await useCase.execute({ q, cursor, limit });

    return NextResponse.json({
      items,
      nextCursor: nextCursor
        ? { createdAt: nextCursor.createdAt.toISOString(), id: nextCursor.id }
        : null,
      limit,
    });
  } catch (err) {
    return serverError(err);
  }
}

/** Disable / re-enable an account. Moderator-only. */
export async function PATCH(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user?.moderator) return forbidden();

    const parsed = await parseBody(req, SetUserDisabledSchema);
    if (!parsed.ok) return parsed.response;
    const { email, disabled } = parsed.data;

    const useCase = new SetUserDisabledUseCase(
      new MongoUserRepository(),
      new MongoCommentRepository(),
    );
    const updated = await useCase.execute(email, disabled, user.username);

    return NextResponse.json({
      email: updated.email,
      username: updated.username,
      disabled: !!updated.disabledAt,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "User not found") {
      return notFound("Usuário não encontrado");
    }
    return serverError(err);
  }
}
