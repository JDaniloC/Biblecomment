import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { MongoCommunityRepository } from "@/infrastructure/repositories/MongoCommunityRepository";
import { MongoCommunityFollowRepository } from "@/infrastructure/repositories/MongoCommunityFollowRepository";
import { MongoUserRepository } from "@/infrastructure/repositories/MongoUserRepository";
import { MyFollowStatusUseCase } from "@/application/use-cases/CommunityUseCases";

export const dynamic = "force-dynamic";

/** Is the signed-in viewer following this community? */
export async function GET(
	_req: Request,
	{ params }: { params: Promise<{ slug: string }> },
) {
	const session = await auth();
	if (!session?.user?.email) {
		return NextResponse.json({ following: false });
	}
	const user = await new MongoUserRepository().findByEmail(session.user.email);
	if (!user?._id) return NextResponse.json({ following: false });

	const { slug } = await params;
	const r = await new MyFollowStatusUseCase(
		new MongoCommunityRepository(),
		new MongoCommunityFollowRepository(),
	).execute({ slug: slug.toLowerCase(), userId: user._id });
	return NextResponse.json(r);
}
