import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { MongoDiscussionRepository } from "@/infrastructure/repositories/MongoDiscussionRepository";
import { MongoBookRepository } from "@/infrastructure/repositories/MongoBookRepository";
import DiscussionDetailClient from "./DiscussionDetailClient";

type Params = { abbrev: string; id: string };

export default async function DiscussionDetailPage({ params }: { params: Promise<Params> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { abbrev, id } = await params;

  const bookRepo = new MongoBookRepository();
  const book = await bookRepo.findByAbbrev(abbrev);
  if (!book) redirect("/home");

  if (id === "new") {
    const repo = new MongoDiscussionRepository();
    const discussions = await repo.findByBookAbbrev(abbrev);
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

  const repo = new MongoDiscussionRepository();
  const [discussion, discussions] = await Promise.all([
    repo.findById(id),
    repo.findByBookAbbrev(abbrev),
  ]);

  return (
    <DiscussionDetailClient
      discussion={discussion}
      discussions={discussions}
      book={book}
      user={session.user}
      mode="detail"
    />
  );
}
