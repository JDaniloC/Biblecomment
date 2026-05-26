import { NextResponse } from "next/server";
import { MongoCommentRepository } from "@/infrastructure/repositories/MongoCommentRepository";
import { MongoCommunityRepository } from "@/infrastructure/repositories/MongoCommunityRepository";
import { MongoCommunityMembershipRepository } from "@/infrastructure/repositories/MongoCommunityMembershipRepository";
import { MongoUserRepository } from "@/infrastructure/repositories/MongoUserRepository";
import { ListCommunityCommentsUseCase } from "@/application/use-cases/CommentUseCases";

const PAGE_SIZE = 20;

export const dynamic = "force-dynamic";

/**
 * Paginated comments by approved members of this community, newest-first.
 * plan_community: linkage is derived from `CommunityMembership` (status =
 * approved), not from a `communitySlug` tag on the Comment doc.
 */
export async function GET(
	req: Request,
	{ params }: { params: Promise<{ slug: string }> },
) {
	const { slug } = await params;
	const url = new URL(req.url);
	const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
	const q = url.searchParams.get("q") ?? undefined;
	const result = await new ListCommunityCommentsUseCase(
		new MongoCommentRepository(),
		new MongoCommunityRepository(),
		new MongoCommunityMembershipRepository(),
		new MongoUserRepository(),
	).execute(slug.toLowerCase(), page, PAGE_SIZE, { q });

	const items = result.items.map((c) => ({
		_id: c._id,
		text: c.text,
		username: c.username,
		bookReference: c.bookReference,
		tags: c.tags,
		createdAt: c.createdAt?.toISOString() ?? null,
		verseId: c.verseId,
		communitySlug: c.communitySlug,
		authorEmailVerified: c.authorEmailVerified,
	}));
	return NextResponse.json({
		items,
		total: result.total,
		page,
		pageSize: PAGE_SIZE,
	});
}
