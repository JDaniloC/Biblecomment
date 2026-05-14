import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { MongoFollowRepository } from "@/infrastructure/repositories/MongoFollowRepository";
import { MongoUserRepository } from "@/infrastructure/repositories/MongoUserRepository";
import { ListFollowConnectionsUseCase } from "@/application/use-cases/FollowUseCases";
import FollowListClient from "../_components/FollowListClient";

interface PageProps {
  params: Promise<{ username: string }>;
}

const PAGE_SIZE = 30;

export default async function FollowingPage({ params }: PageProps) {
  const { username } = await params;
  const slug = username.toLowerCase();

  const session = await auth();
  const result = await new ListFollowConnectionsUseCase(
    new MongoFollowRepository(),
    new MongoUserRepository(),
  ).execute({
    targetUsername: slug,
    direction: "following",
    page: 1,
    pageSize: PAGE_SIZE,
    viewerEmail: session?.user?.email ?? null,
  });
  if (!result) notFound();

  const viewer = session?.user
    ? {
        name: session.user.name ?? session.user.username,
        username: session.user.username,
        email: session.user.email,
        moderator: session.user.moderator,
      }
    : null;

  return (
    <FollowListClient
      ownerUsername={slug}
      direction="following"
      initialItems={result.items}
      initialTotal={result.total}
      pageSize={PAGE_SIZE}
      viewer={viewer}
    />
  );
}

export async function generateMetadata({ params }: PageProps) {
  const { username } = await params;
  return {
    title: `@${username} está seguindo — Bible Comment`,
    description: `Pessoas que @${username} segue.`,
  };
}

export const dynamic = "force-dynamic";
