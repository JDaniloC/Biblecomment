import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { MongoCommunityRepository } from "@/infrastructure/repositories/MongoCommunityRepository";
import { MongoCommunityMembershipRepository } from "@/infrastructure/repositories/MongoCommunityMembershipRepository";
import { MongoUserRepository } from "@/infrastructure/repositories/MongoUserRepository";
import { MongoNotificationRepository } from "@/infrastructure/repositories/MongoNotificationRepository";
import { RequestJoinCommunityUseCase } from "@/application/use-cases/CommunityUseCases";

export const dynamic = "force-dynamic";

async function sessionUserId(): Promise<string | null> {
	const session = await auth();
	if (!session?.user?.email) return null;
	const u = await new MongoUserRepository().findByEmail(session.user.email);
	return u?._id ?? null;
}

/** POST = request to join (pending). DELETE = cancel request / leave. */
export async function POST(
	_req: Request,
	{ params }: { params: Promise<{ slug: string }> },
) {
	const userId = await sessionUserId();
	if (!userId) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}
	const { slug } = await params;
	try {
		await new RequestJoinCommunityUseCase(
			new MongoCommunityRepository(),
			new MongoCommunityMembershipRepository(),
			new MongoUserRepository(),
			new MongoNotificationRepository(),
		).execute({ slug: slug.toLowerCase(), userId });
		return NextResponse.json({ status: "pending" });
	} catch (err) {
		const msg = err instanceof Error ? err.message : "Unknown";
		if (msg.includes("não encontrada")) {
			return NextResponse.json({ error: "Not found" }, { status: 404 });
		}
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}

export async function DELETE(
	_req: Request,
	{ params }: { params: Promise<{ slug: string }> },
) {
	const userId = await sessionUserId();
	if (!userId) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}
	const { slug } = await params;
	try {
		const communities = new MongoCommunityRepository();
		const memberships = new MongoCommunityMembershipRepository();
		const c = await communities.findBySlug(slug.toLowerCase());
		if (!c || !c._id) {
			return NextResponse.json({ error: "Not found" }, { status: 404 });
		}
		const wasApproved = (await memberships.approvedUserIds(c._id)).includes(
			userId,
		);
		const removed = await memberships.remove(userId, c._id);
		if (removed && wasApproved) {
			await communities.incrementMemberCount(c._id, -1);
		}
		return NextResponse.json({ removed });
	} catch (err) {
		const msg = err instanceof Error ? err.message : "Unknown";
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}
