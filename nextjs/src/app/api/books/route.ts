import { NextResponse } from "next/server";
import { MongoBookRepository } from "@/infrastructure/repositories/MongoBookRepository";
import { GetAllBooksUseCase, CreateBookUseCase } from "@/application/use-cases/BookUseCases";
import { getSessionUser, forbidden, badRequest, serverError } from "@/lib/get-session";
import { buildBooksResponse } from "./buildResponse";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const repo = new MongoBookRepository();
    const useCase = new GetAllBooksUseCase(repo);
    const books = await useCase.execute();
    return buildBooksResponse(books);
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user?.moderator) return forbidden();

    const body = (await req.json()) as { name?: string; abbrev?: string; chapters?: number };
    const { name, abbrev, chapters } = body;
    if (!name || !abbrev || !chapters) {
      return badRequest("Campos obrigatórios: name, abbrev, chapters");
    }

    const repo = new MongoBookRepository();
    const useCase = new CreateBookUseCase(repo);
    const book = await useCase.execute(name, abbrev, chapters);
    return NextResponse.json(book, { status: 201 });
  } catch (err) {
    return serverError(err);
  }
}
