import { NextResponse } from "next/server";
import { MongoCommentRepository } from "@/infrastructure/repositories/MongoCommentRepository";
import { getSessionUser, unauthorized, serverError } from "@/lib/get-session";

const PAGE_SIZE = 50;

export async function GET(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("pages") ?? "1", 10);

    const repo = new MongoCommentRepository();

    const userComments = await repo.findByUsername(user.username);

    const start = (page - 1) * PAGE_SIZE;
    const comments = userComments.slice(start, start + PAGE_SIZE);

    return NextResponse.json({ comments });
  } catch (err) {
    return serverError(err);
  }
}
