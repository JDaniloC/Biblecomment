import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { MongoCommunityRepository } from "@/infrastructure/repositories/MongoCommunityRepository";
import { MongoCommunityMembershipRepository } from "@/infrastructure/repositories/MongoCommunityMembershipRepository";
import { MongoUserRepository } from "@/infrastructure/repositories/MongoUserRepository";
import { MongoNotificationRepository } from "@/infrastructure/repositories/MongoNotificationRepository";
import { SetModeratorUseCase } from "@/application/use-cases/CommunityUseCases";

export const dynamic = "force-dynamic";

async function actorId(): Promise<string | null> {
	const session = await auth();
	if (!session?.user?.email) return null;
	const u = await new MongoUserRepository().findByEmail(session.user.email);
	return u?._id ?? null;
}

function mapError(err: unknown) {
	const msg = err instanceof Error ? err.message : "Unknown";
	if (msg.includes("não encontrada")) {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}
	if (msg.includes("criador")) {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	}
	return NextResponse.json({ error: msg }, { status: 500 });
}

async function setModerator(
	slug: string,
	targetUserId: string,
	makeModerator: boolean,
) {
	const actor = await actorId();
	if (!actor) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}
	try {
		await new SetModeratorUseCase(
			new MongoCommunityRepository(),
			new MongoCommunityMembershipRepository(),
			new MongoUserRepository(),
			new MongoNotificationRepository(),
		).execute({
			slug: slug.toLowerCase(),
			actorId: actor,
			targetUserId,
			makeModerator,
		});
		return NextResponse.json({ ok: true });
	} catch (err) {
		return mapError(err);
	}
}

/** POST = promote to moderator (creator only). */
export async function POST(
	_req: Request,
	{ params }: { params: Promise<{ slug: string; userId: string }> },
) {
	const { slug, userId } = await params;
	return setModerator(slug, userId, true);
}

/** DELETE = demote moderator (creator only). */
export async function DELETE(
	_req: Request,
	{ params }: { params: Promise<{ slug: string; userId: string }> },
) {
	const { slug, userId } = await params;
	return setModerator(slug, userId, false);
}
