import { NextResponse } from "next/server";
import { MongoCommentRepository } from "@/infrastructure/repositories/MongoCommentRepository";
import { ListCommunityCommentsUseCase } from "@/application/use-cases/CommentUseCases";

const PAGE_SIZE = 20;

export const dynamic = "force-dynamic";

/** Paginated comments posted to this community, newest-first. */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
  const result = await new ListCommunityCommentsUseCase(
    new MongoCommentRepository(),
  ).execute(slug.toLowerCase(), page, PAGE_SIZE);

  const items = result.items.map((c) => ({
    _id: c._id,
    text: c.text,
    username: c.username,
    bookReference: c.bookReference,
    tags: c.tags,
    createdAt: c.createdAt?.toISOString() ?? null,
    verseId: c.verseId,
    communitySlug: c.communitySlug,
  }));
  return NextResponse.json({ items, total: result.total, page, pageSize: PAGE_SIZE });
}
