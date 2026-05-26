import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { MongoDiscussionRepository } from "@/infrastructure/repositories/MongoDiscussionRepository";
import { MongoDiscussionAnswerRepository } from "@/infrastructure/repositories/MongoDiscussionAnswerRepository";
import { MongoBookRepository } from "@/infrastructure/repositories/MongoBookRepository";
import { MongoUserRepository } from "@/infrastructure/repositories/MongoUserRepository";
import {
  GetDiscussionsUseCase,
  GetDiscussionByIdUseCase,
} from "@/application/use-cases/DiscussionUseCases";
import { toDiscussionWire } from "@/lib/discussion-wire";
import DiscussionDetailClient from "./DiscussionDetailClient";

type Params = { abbrev: string; id: string };

export default async function DiscussionDetailPage({ params }: { params: Promise<Params> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { abbrev, id } = await params;

  const bookRepo = new MongoBookRepository();
  const book = await bookRepo.findByAbbrev(abbrev);
  if (!book) redirect("/home");

  const discussionRepo = new MongoDiscussionRepository();
  const answerRepo = new MongoDiscussionAnswerRepository();
  const listUC = new GetDiscussionsUseCase(discussionRepo, answerRepo);

  if (id === "new") {
    const discussions = (await listUC.execute(abbrev)).map(toDiscussionWire);
    return (
      <DiscussionDetailClient
        discussion={null}
        discussions={discussions}
        book={book}
        user={session.user}
        mode="list"
      />
    );
  }

  const detailUC = new GetDiscussionByIdUseCase(discussionRepo, answerRepo, new MongoUserRepository());
  const [discussion, discussions] = await Promise.all([
    detailUC.execute(id),
    listUC.execute(abbrev),
  ]);

  return (
    <DiscussionDetailClient
      discussion={discussion ? toDiscussionWire(discussion) : null}
      discussions={discussions.map(toDiscussionWire)}
      book={book}
      user={session.user}
      mode="detail"
    />
  );
}
