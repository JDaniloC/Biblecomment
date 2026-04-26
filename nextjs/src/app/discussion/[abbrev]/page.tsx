import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { MongoDiscussionRepository } from "@/infrastructure/repositories/MongoDiscussionRepository";
import { MongoBookRepository } from "@/infrastructure/repositories/MongoBookRepository";
import DiscussionDetailClient from "./[id]/DiscussionDetailClient";

type Params = { abbrev: string };
type SearchParams = { commentId?: string; ref?: string; text?: string };

export default async function DiscussionListPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { abbrev } = await params;
  const sp = await searchParams;

  const bookRepo = new MongoBookRepository();
  const book = await bookRepo.findByAbbrev(abbrev);
  if (!book) redirect("/home");

  const repo = new MongoDiscussionRepository();
  const discussions = await repo.findByBookAbbrev(abbrev);

  return (
    <DiscussionDetailClient
      discussion={null}
      discussions={discussions}
      book={book}
      user={session.user}
      mode="list"
      initialCommentId={sp.commentId}
      initialRef={sp.ref}
      initialText={sp.text}
    />
  );
}
