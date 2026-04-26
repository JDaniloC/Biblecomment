import { NextResponse } from "next/server";
import { MongoVerseRepository } from "@/infrastructure/repositories/MongoVerseRepository";
import { UpdateVerseUseCase } from "@/application/use-cases/VerseUseCases";
import { getSessionUser, forbidden, notFound, serverError } from "@/lib/get-session";
import { parseBody } from "@/lib/parse-body";
import { UpdateVerseSchema } from "@/lib/schemas";
import { logger } from "@/lib/logger";

type Params = { id: string };

export async function PATCH(req: Request, { params }: { params: Promise<Params> }) {
  try {
    const user = await getSessionUser();
    if (!user?.moderator) return forbidden();

    const { id } = await params;
    const parsed = await parseBody(req, UpdateVerseSchema);
    if (!parsed.ok) return parsed.response;

    const repo = new MongoVerseRepository();
    const useCase = new UpdateVerseUseCase(repo);
    const verse = await useCase.execute(id, parsed.data);

    logger.info(
      { actor: user.email, verseId: id, fields: Object.keys(parsed.data), action: "update_verse" },
      "verse updated",
    );

    return NextResponse.json(verse);
  } catch (err) {
    if (err instanceof Error && err.message === "Verse not found") {
      return notFound("Verse not found");
    }
    return serverError(err);
  }
}
