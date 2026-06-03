import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { DISCUSSIONS_TUTORIAL_NAME } from "@/lib/tutorial-config";
import { MongoBookRepository } from "@/infrastructure/repositories/MongoBookRepository";
import { logger } from "@/lib/logger";
import DiscussionsClient from "./DiscussionsClient";

export default async function DiscussionsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tutorialAlreadyCompleted =
    session.user.tutorialsCompleted?.includes(DISCUSSIONS_TUTORIAL_NAME) ??
    false;

  // Fetch the book list server-side so the filter dropdown is populated on
  // first paint. Wrapped defensively: a repo failure (e.g. Mongo unreachable
  // at build) degrades to an empty filter rather than crashing the page.
  let books: Array<{ abbrev: string; name: string }> = [];
  try {
    const bookRepo = new MongoBookRepository();
    const all = await bookRepo.findAll();
    books = all
      .map((b) => ({ abbrev: b.abbrev, name: b.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (err) {
    logger.warn({ err }, "discussions page: book repo unavailable, filter empty");
  }

  return (
    <DiscussionsClient
      user={session.user}
      tutorialAlreadyCompleted={tutorialAlreadyCompleted}
      books={books}
    />
  );
}
