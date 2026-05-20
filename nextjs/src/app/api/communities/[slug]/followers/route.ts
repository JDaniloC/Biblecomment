import { NextResponse } from "next/server";
import { MongoCommunityRepository } from "@/infrastructure/repositories/MongoCommunityRepository";
import { MongoCommunityFollowRepository } from "@/infrastructure/repositories/MongoCommunityFollowRepository";
import { MongoUserRepository } from "@/infrastructure/repositories/MongoUserRepository";
import { ListCommunityFollowersUseCase } from "@/application/use-cases/CommunityUseCases";

export const dynamic = "force-dynamic";

/**
 * GET — followers of this community, enriched with username, newest
 * follow first. Public (the count is already on the header).
 */
export async function GET(
	_req: Request,
	{ params }: { params: Promise<{ slug: string }> },
) {
	const { slug } = await params;
	const followers = await new ListCommunityFollowersUseCase(
		new MongoCommunityRepository(),
		new MongoCommunityFollowRepository(),
		new MongoUserRepository(),
	).execute(slug.toLowerCase());
	return NextResponse.json({
		followers: followers.map((f) => ({
			userId: f.userId,
			username: f.username,
			followedAt: f.followedAt?.toISOString() ?? null,
		})),
	});
}
