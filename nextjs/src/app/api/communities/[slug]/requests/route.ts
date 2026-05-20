import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { MongoCommunityRepository } from "@/infrastructure/repositories/MongoCommunityRepository";
import { MongoCommunityMembershipRepository } from "@/infrastructure/repositories/MongoCommunityMembershipRepository";
import { MongoUserRepository } from "@/infrastructure/repositories/MongoUserRepository";
import { ListJoinRequestsUseCase } from "@/application/use-cases/CommunityUseCases";

export const dynamic = "force-dynamic";

/** GET — pending join requests (moderator only). */
export async function GET(
	_req: Request,
	{ params }: { params: Promise<{ slug: string }> },
) {
	const session = await auth();
	if (!session?.user?.email) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}
	const userRepo = new MongoUserRepository();
	const actor = await userRepo.findByEmail(session.user.email);
	if (!actor?._id) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}
	const { slug } = await params;
	try {
		const pending = await new ListJoinRequestsUseCase(
			new MongoCommunityRepository(),
			new MongoCommunityMembershipRepository(),
		).execute({ slug: slug.toLowerCase(), actorId: actor._id });

		const users = await userRepo.findManyByIds(pending.map((m) => m.userId));
		const nameById = new Map(users.map((u) => [u._id, u.username]));
		return NextResponse.json({
			requests: pending.map((m) => ({
				userId: m.userId,
				username: nameById.get(m.userId) ?? null,
				joinedAt: m.joinedAt,
			})),
		});
	} catch (err) {
		const msg = err instanceof Error ? err.message : "Unknown";
		if (msg.includes("não encontrada")) {
			return NextResponse.json({ error: "Not found" }, { status: 404 });
		}
		if (msg.includes("moderador")) {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		}
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}
