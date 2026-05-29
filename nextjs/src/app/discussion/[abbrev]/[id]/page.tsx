import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { MongoDiscussionRepository } from "@/infrastructure/repositories/MongoDiscussionRepository";
import { MongoDiscussionAnswerRepository } from "@/infrastructure/repositories/MongoDiscussionAnswerRepository";
import { MongoCommentRepository } from "@/infrastructure/repositories/MongoCommentRepository";
import { MongoBookRepository } from "@/infrastructure/repositories/MongoBookRepository";
import { MongoUserRepository } from "@/infrastructure/repositories/MongoUserRepository";
import { MongoDiscussionLikeRepository } from "@/infrastructure/repositories/MongoDiscussionLikeRepository";
import { GetDiscussionByIdUseCase } from "@/application/use-cases/DiscussionUseCases";
import { toDiscussionWire } from "@/lib/discussion-wire";
import DiscussionDetailClient from "./DiscussionDetailClient";
import CreateDiscussionClient from "./CreateDiscussionClient";

type Params = { abbrev: string; id: string };
type SearchParams = { commentId?: string };

export default async function DiscussionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { abbrev, id } = await params;

  const bookRepo = new MongoBookRepository();
  const book = await bookRepo.findByAbbrev(abbrev);
  if (!book) redirect("/home");

  // Create flow: a discussion is always opened on top of a comment, so the
  // "new" route requires a commentId. We fetch the comment server-side and
  // hand its authoritative text to the form (the client can't supply it).
  if (id === "new") {
    const { commentId } = await searchParams;
    if (!commentId) redirect(`/discussion/${abbrev}`);
    const comment = await new MongoCommentRepository().findById(commentId);
    if (!comment || !comment._id) redirect(`/discussion/${abbrev}`);
    return (
      <CreateDiscussionClient
        book={book}
        user={session.user}
        sourceComment={{
          id: comment._id,
          text: comment.text,
          reference: comment.bookReference,
        }}
      />
    );
  }

  const detailUC = new GetDiscussionByIdUseCase(
    new MongoDiscussionRepository(),
    new MongoDiscussionAnswerRepository(),
    new MongoUserRepository(),
    new MongoDiscussionLikeRepository(),
  );
  const discussion = await detailUC.execute(id, session.user.id);

  return (
    <DiscussionDetailClient
      discussion={discussion ? toDiscussionWire(discussion) : null}
      discussions={[]}
      book={book}
      user={session.user}
      mode="detail"
    />
  );
}
