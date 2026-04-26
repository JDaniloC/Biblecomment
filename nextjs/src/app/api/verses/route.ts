import { NextResponse } from "next/server";
import { MongoVerseRepository } from "@/infrastructure/repositories/MongoVerseRepository";
import { CreateVerseUseCase } from "@/application/use-cases/VerseUseCases";
import { getSessionUser, forbidden, serverError } from "@/lib/get-session";
import { parseBody } from "@/lib/parse-body";
import { CreateVerseSchema } from "@/lib/schemas";
import { logger } from "@/lib/logger";

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user?.moderator) return forbidden();

    const parsed = await parseBody(req, CreateVerseSchema);
    if (!parsed.ok) return parsed.response;

    const repo = new MongoVerseRepository();
    const useCase = new CreateVerseUseCase(repo);
    const verse = await useCase.execute(parsed.data);

    logger.info(
      { actor: user.email, abbrev: verse.abbrev, chapter: verse.chapter, verseNumber: verse.verseNumber, action: "create_verse" },
      "verse created",
    );

    return NextResponse.json(verse, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "Verse already exists") {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    return serverError();
  }
}
