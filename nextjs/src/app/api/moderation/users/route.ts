import { NextResponse } from "next/server";
import { MongoUserRepository } from "@/infrastructure/repositories/MongoUserRepository";
import { ListUsersForModerationUseCase } from "@/application/use-cases/UserUseCases";
import {
  getSessionUser,
  forbidden,
  badRequest,
  serverError,
} from "@/lib/get-session";

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
