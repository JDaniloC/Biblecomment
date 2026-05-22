import { NextResponse } from "next/server";
import { MongoCommentRepository } from "@/infrastructure/repositories/MongoCommentRepository";
import { getSessionUser, unauthorized, serverError } from "@/lib/get-session";

const PAGE_SIZE = 50;

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const { searchParams } = new URL(req.url);
    const parsed = parseInt(searchParams.get("pages") ?? "1", 10);
    const page = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;

    const repo = new MongoCommentRepository();
    // The owner sees their own soft-hidden comments here (the profile marks
    // them); public profile views go through a different route that excludes them.
    const comments = await repo.findByUsernamePaginated(
      user.username,
      page,
      PAGE_SIZE,
      { includeHidden: true },
    );

    return NextResponse.json({ comments });
  } catch (err) {
    return serverError(err);
  }
}
