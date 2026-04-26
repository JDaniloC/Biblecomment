import { NextResponse } from "next/server";
import { MongoBookRepository } from "@/infrastructure/repositories/MongoBookRepository";
import { GetBookByAbbrevUseCase } from "@/application/use-cases/BookUseCases";
import { notFound, serverError } from "@/lib/get-session";

type Params = { abbrev: string };

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<Params> }) {
  try {
    const { abbrev } = await params;
    const repo = new MongoBookRepository();
    const useCase = new GetBookByAbbrevUseCase(repo);
    const book = await useCase.execute(abbrev);
    if (!book) return notFound("Livro não encontrado");
    return NextResponse.json(book);
  } catch (err) {
    return serverError(err);
  }
}
