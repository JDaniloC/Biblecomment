import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { MongoCommunityRepository } from "@/infrastructure/repositories/MongoCommunityRepository";
import { MongoCommunityMembershipRepository } from "@/infrastructure/repositories/MongoCommunityMembershipRepository";
import { MongoUserRepository } from "@/infrastructure/repositories/MongoUserRepository";
import { serverError } from "@/lib/get-session";

export const dynamic = "force-dynamic";

/** GET — the signed-in user's APPROVED communities (selector options). */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ communities: [] });
    }
    const user = await new MongoUserRepository().findByEmail(
      session.user.email,
    );
    if (!user?._id) return NextResponse.json({ communities: [] });

    const memberships = await new MongoCommunityMembershipRepository().listForUser(
      user._id,
    );
    const approvedIds = memberships
      .filter((m) => m.status === "approved")
      .map((m) => m.communityId);
    if (approvedIds.length === 0) {
      return NextResponse.json({ communities: [] });
    }
    const communities = await new MongoCommunityRepository().findManyByIds(
      approvedIds,
    );
    return NextResponse.json({
      communities: communities.map((c) => ({ slug: c.slug, name: c.name })),
    });
  } catch (err) {
    return serverError(err);
  }
}
