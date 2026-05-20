import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { MongoCommunityRepository } from "@/infrastructure/repositories/MongoCommunityRepository";
import { MongoCommunityMembershipRepository } from "@/infrastructure/repositories/MongoCommunityMembershipRepository";
import { MongoUserRepository } from "@/infrastructure/repositories/MongoUserRepository";
import { serverError } from "@/lib/get-session";

export const dynamic = "force-dynamic";

/** GET — the signed-in viewer's membership status/role in this community.
 *  none = no row; pending = awaiting approval; approved = member. */
export async function GET(
	_req: Request,
	{ params }: { params: Promise<{ slug: string }> },
) {
	try {
		const { slug } = await params;
		const session = await auth();
		if (!session?.user?.email) {
			return NextResponse.json({ status: "none", role: "member" });
		}
		const user = await new MongoUserRepository().findByEmail(
			session.user.email,
		);
		if (!user?._id) {
			return NextResponse.json({ status: "none", role: "member" });
		}
		const community = await new MongoCommunityRepository().findBySlug(
			slug.toLowerCase(),
		);
		if (!community?._id) {
			return NextResponse.json({ status: "none", role: "member" });
		}
		const list = await new MongoCommunityMembershipRepository().listForUser(
			user._id,
		);
		const row = list.find((m) => m.communityId === community._id);
		return NextResponse.json({
			status: row?.status ?? "none",
			role: row?.role ?? "member",
		});
	} catch (err) {
		return serverError(err);
	}
}
