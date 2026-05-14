import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { MongoCommunityRepository } from "@/infrastructure/repositories/MongoCommunityRepository";
import { MongoCommunityMembershipRepository } from "@/infrastructure/repositories/MongoCommunityMembershipRepository";
import { MongoUserRepository } from "@/infrastructure/repositories/MongoUserRepository";
import CommunityDetailClient from "./CommunityDetailClient";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function CommunityDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const lowSlug = slug.toLowerCase();

  const communityRepo = new MongoCommunityRepository();
  const community = await communityRepo.findBySlug(lowSlug);
  if (!community) notFound();

  const session = await auth();
  let isMember = false;
  let isCreator = false;
  let creatorUsername: string | undefined;

  const userRepo = new MongoUserRepository();
  if (session?.user?.email) {
    const viewer = await userRepo.findByEmail(session.user.email);
    if (viewer?._id && community._id) {
      isMember = await new MongoCommunityMembershipRepository().isMember(
        viewer._id,
        community._id,
      );
      isCreator = community.createdBy === viewer._id;
    }
  }

  // Resolve creator username for display — falls back to "alguém" if the
  // user account was hard-deleted (rare, but the page should still render).
  const [creator] = await userRepo.findManyByIds([community.createdBy]);
  creatorUsername = creator?.username;

  const viewer = session?.user
    ? {
        name: session.user.name ?? session.user.username,
        username: session.user.username,
        email: session.user.email,
        moderator: session.user.moderator,
      }
    : null;

  return (
    <CommunityDetailClient
      community={community}
      isMember={isMember}
      isCreator={isCreator}
      creatorUsername={creatorUsername}
      viewer={viewer}
    />
  );
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  return {
    title: `/${slug} — Comunidade — Bible Comment`,
  };
}
