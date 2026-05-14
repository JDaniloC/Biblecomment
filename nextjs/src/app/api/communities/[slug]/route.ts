import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { MongoCommunityRepository } from "@/infrastructure/repositories/MongoCommunityRepository";
import { MongoCommunityMembershipRepository } from "@/infrastructure/repositories/MongoCommunityMembershipRepository";
import { MongoUserRepository } from "@/infrastructure/repositories/MongoUserRepository";

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
