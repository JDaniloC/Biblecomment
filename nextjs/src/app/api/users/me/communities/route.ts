import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { MongoUserRepository } from "@/infrastructure/repositories/MongoUserRepository";
import { MongoCommunityMembershipRepository } from "@/infrastructure/repositories/MongoCommunityMembershipRepository";
import { MongoCommunityRepository } from "@/infrastructure/repositories/MongoCommunityRepository";

export const dynamic = "force-dynamic";

/**
 * List the communities the signed-in user belongs to. Used by the chapter
 * comment composer to populate the "Postar em" select. Returns `[]` for
 * anonymous viewers so the client can render without branching on 401.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ items: [] });

  const user = await new MongoUserRepository().findByEmail(session.user.email);
  if (!user?._id) return NextResponse.json({ items: [] });

  const ids = await new MongoCommunityMembershipRepository().listCommunityIdsForUser(
    user._id,
  );
  if (ids.length === 0) return NextResponse.json({ items: [] });

  const communities = await new MongoCommunityRepository().findManyByIds(ids);
  // Sort newest-joined first, matching the order listCommunityIdsForUser
  // already returns. findManyByIds doesn't preserve order, so re-order by
  // the original id list.
  const byId = new Map(communities.map((c) => [c._id ?? "", c]));
  const items = ids
    .map((id) => byId.get(id))
    .filter((c): c is NonNullable<typeof c> => !!c)
    .map((c) => ({ slug: c.slug, name: c.name }));
  return NextResponse.json({ items });
}
