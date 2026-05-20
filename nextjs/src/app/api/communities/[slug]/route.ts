import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { MongoCommunityRepository } from "@/infrastructure/repositories/MongoCommunityRepository";
import { MongoCommunityMembershipRepository } from "@/infrastructure/repositories/MongoCommunityMembershipRepository";
import { MongoCommunityFollowRepository } from "@/infrastructure/repositories/MongoCommunityFollowRepository";
import { MongoUserRepository } from "@/infrastructure/repositories/MongoUserRepository";
import { DeleteCommunityUseCase } from "@/application/use-cases/CommunityUseCases";

export const dynamic = "force-dynamic";

/** Detail endpoint. Includes `isMember` when an authed viewer is present. */
export async function GET(
	_req: Request,
	{ params }: { params: Promise<{ slug: string }> },
) {
	const { slug } = await params;
	const communityRepo = new MongoCommunityRepository();
	const community = await communityRepo.findBySlug(slug.toLowerCase());
	if (!community) {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}

	const session = await auth();
	let isMember = false;
	if (session?.user?.email) {
		const userRepo = new MongoUserRepository();
		const viewer = await userRepo.findByEmail(session.user.email);
		if (viewer?._id && community._id) {
			isMember = await new MongoCommunityMembershipRepository().isMember(
				viewer._id,
				community._id,
			);
		}
	}
	return NextResponse.json({ community, isMember });
}

/**
 * Creator-only delete. Cascades memberships + follows; comments stay
 * (they're anchored to verses and just lose the community-prioritization
 * pivot). 401 unauth, 403 non-creator, 404 missing.
 */
export async function DELETE(
	_req: Request,
	{ params }: { params: Promise<{ slug: string }> },
) {
	const session = await auth();
	if (!session?.user?.email) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}
	const { slug } = await params;

	const userRepo = new MongoUserRepository();
	const viewer = await userRepo.findByEmail(session.user.email);
	if (!viewer?._id) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const useCase = new DeleteCommunityUseCase(
		new MongoCommunityRepository(),
		new MongoCommunityMembershipRepository(),
		new MongoCommunityFollowRepository(),
	);
	try {
		const result = await useCase.execute({
			slug: slug.toLowerCase(),
			actorId: viewer._id,
		});
		return NextResponse.json({ ok: true, ...result });
	} catch (err) {
		// Map use-case error strings to the codebase's standard API shape
		// (404 → "Not found", 403 → "Forbidden") so clients can branch on a
		// stable contract instead of grepping pt-BR messages. Copilot PR-206.
		const message = err instanceof Error ? err.message : "Erro desconhecido";
		if (message.includes("não encontrada")) {
			return NextResponse.json({ error: "Not found" }, { status: 404 });
		}
		if (message.includes("Apenas o criador")) {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		}
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
