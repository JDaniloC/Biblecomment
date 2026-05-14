import { NextResponse } from "next/server";
import { MongoCommentRepository } from "@/infrastructure/repositories/MongoCommentRepository";

const PAGE_SIZE = 20;

export const dynamic = "force-dynamic";

/**
 * Paginated public list of a user's comments. `findByUsernamePaginated`
 * returns the base Comment entity without enriching mod-only fields
 * (reportCount, reporters), so anonymous viewers cannot read those even
 * if a future field were added.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params;
  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
  const repo = new MongoCommentRepository();
  const comments = await repo.findByUsernamePaginated(username, page, PAGE_SIZE);
  return NextResponse.json({ comments, page, pageSize: PAGE_SIZE });
}
