import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { MongoBookRepository } from "@/infrastructure/repositories/MongoBookRepository";
import { GetAllBooksUseCase } from "@/application/use-cases/BookUseCases";
import HomeClient from "./HomeClient";

export default async function HomePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const repo = new MongoBookRepository();
  const useCase = new GetAllBooksUseCase(repo);
  const books = await useCase.execute();

  return <HomeClient books={books} user={session.user} />;
}
