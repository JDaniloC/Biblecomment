import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { MongoUserRepository } from "@/infrastructure/repositories/MongoUserRepository";
import { MongoCommentRepository } from "@/infrastructure/repositories/MongoCommentRepository";
import { MongoFollowRepository } from "@/infrastructure/repositories/MongoFollowRepository";
import { GetFollowStateUseCase } from "@/application/use-cases/FollowUseCases";
import PublicProfileClient from "./PublicProfileClient";

interface PageProps {
  params: Promise<{ username: string }>;
}

const INITIAL_PAGE_SIZE = 20;

export default async function PublicProfilePage({ params }: PageProps) {
  const { username } = await params;
  const slug = username.toLowerCase();

  const [user, comments, session] = await Promise.all([
    new MongoUserRepository().findByUsernamePublic(slug),
    new MongoCommentRepository().findByUsernamePaginated(slug, 1, INITIAL_PAGE_SIZE),
    auth(),
  ]);
  if (!user) notFound();

  const viewer = session?.user
    ? {
        name: session.user.name ?? session.user.username,
        username: session.user.username,
        email: session.user.email,
        moderator: session.user.moderator,
      }
    : null;

  const followState = await new GetFollowStateUseCase(
    new MongoFollowRepository(),
    new MongoUserRepository(),
  ).execute(slug, viewer?.email ?? null);

  // Mongoose docs carry Date instances; the client gets ISO strings over the
  // wire boundary so we normalize here rather than mixing types client-side.
  const serializableUser = {
    ...user,
    createdAt: user.createdAt.toISOString(),
  };
  const serializableComments = comments.map((c) => ({
    _id: c._id,
    bookReference: c.bookReference,
    text: c.text,
    tags: c.tags,
    createdAt: c.createdAt ? c.createdAt.toISOString() : null,
  }));

  return (
    <PublicProfileClient
      user={serializableUser}
      initialComments={serializableComments}
      initialHasMore={comments.length === INITIAL_PAGE_SIZE}
      viewer={viewer}
      initialFollowState={followState ?? { followers: 0, following: 0, isFollowing: false }}
    />
  );
}

export async function generateMetadata({ params }: PageProps) {
  const { username } = await params;
  return {
    title: `@${username} — Bible Comment`,
    description: `Perfil público de @${username} no Bible Comment.`,
  };
}

// auth() + Mongo lookups depend on per-request cookies and live data. Without
// the explicit hint Next 15 + @netlify/plugin-nextjs has been seen to skip
// the dynamic route during build, producing 404s in production.
export const dynamic = "force-dynamic";
