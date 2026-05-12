import { NextResponse } from "next/server";
import { MongoDiscussionRepository } from "@/infrastructure/repositories/MongoDiscussionRepository";
import { MongoDiscussionAnswerRepository } from "@/infrastructure/repositories/MongoDiscussionAnswerRepository";
import { UpdateAnswerUseCase } from "@/application/use-cases/DiscussionUseCases";
import { getSessionUser, unauthorized, forbidden, notFound, serverError } from "@/lib/get-session";
import { parseBody } from "@/lib/parse-body";
import { toDiscussionWire } from "@/lib/discussion-wire";
import { UpdateAnswerSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

type Params = { abbrev: string; id: string; answerId: string };

export async function PATCH(req: Request, { params }: { params: Promise<Params> }) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const { id, answerId } = await params;
    const parsed = await parseBody(req, UpdateAnswerSchema);
    if (!parsed.ok) return parsed.response;

    const useCase = new UpdateAnswerUseCase(
      new MongoDiscussionRepository(),
      new MongoDiscussionAnswerRepository(),
    );
    const discussion = await useCase.execute(
      id,
      answerId,
      user.id,
      user.username,
      user.moderator,
      parsed.data.text,
    );
    return NextResponse.json(toDiscussionWire(discussion));
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "Unauthorized") return forbidden();
      if (err.message === "Discussion not found") return notFound("Discussão não encontrada");
      if (err.message === "Answer not found") return notFound("Resposta não encontrada");
    }
    return serverError(err);
  }
}
