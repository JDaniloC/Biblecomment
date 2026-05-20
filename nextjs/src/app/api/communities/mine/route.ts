import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { MongoCommunityRepository } from "@/infrastructure/repositories/MongoCommunityRepository";
import { MongoCommunityFollowRepository } from "@/infrastructure/repositories/MongoCommunityFollowRepository";
import { MongoUserRepository } from "@/infrastructure/repositories/MongoUserRepository";
import { MyFollowedCommunitiesUseCase } from "@/application/use-cases/CommunityUseCases";
import { serverError } from "@/lib/get-session";

export const dynamic = "force-dynamic";

/**
 * GET — communities the signed-in user FOLLOWS. Populates the active-
 * community selector in the AppHeader profile dropdown.
 *
 * plan_community follow-up: this used to return APPROVED memberships,
 * conflating two distinct concepts. Now follow is a viewer opt-in,
 * orthogonal to membership status (approve auto-creates a follow row).
 */
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

    const followed = await new MyFollowedCommunitiesUseCase(
      new MongoCommunityRepository(),
      new MongoCommunityFollowRepository(),
    ).execute(user._id);

    return NextResponse.json({
      communities: followed.map((c) => ({ slug: c.slug, name: c.name })),
    });
  } catch (err) {
    return serverError(err);
  }
}
