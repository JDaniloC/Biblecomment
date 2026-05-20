import { NextResponse } from "next/server";
import { MongoCommunityRepository } from "@/infrastructure/repositories/MongoCommunityRepository";
import { MongoCommunityMembershipRepository } from "@/infrastructure/repositories/MongoCommunityMembershipRepository";
import { MongoUserRepository } from "@/infrastructure/repositories/MongoUserRepository";
import { ListCommunityMembersUseCase } from "@/application/use-cases/CommunityUseCases";

export const dynamic = "force-dynamic";

/**
 * GET — approved members of this community, enriched with username +
 * role + isCreator flag. Powers the creator-only moderator management
 * list in CommunityDetailClient.
 *
 * Public on purpose — the header already shows "N membros" and the slug
 * is public; the names of those N people are not sensitive.
 */
export async function GET(
	_req: Request,
	{ params }: { params: Promise<{ slug: string }> },
) {
	const { slug } = await params;
	const members = await new ListCommunityMembersUseCase(
		new MongoCommunityRepository(),
		new MongoCommunityMembershipRepository(),
		new MongoUserRepository(),
	).execute(slug.toLowerCase());
	return NextResponse.json({
		members: members.map((m) => ({
			userId: m.userId,
			username: m.username,
			role: m.role,
			isCreator: m.isCreator,
			joinedAt: m.joinedAt?.toISOString() ?? null,
		})),
	});
}
