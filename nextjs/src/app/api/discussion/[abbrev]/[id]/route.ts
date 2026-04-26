import { NextResponse } from "next/server";
import { MongoDiscussionRepository } from "@/infrastructure/repositories/MongoDiscussionRepository";
import { GetDiscussionByIdUseCase } from "@/application/use-cases/DiscussionUseCases";
import { notFound, serverError } from "@/lib/get-session";

type Params = { abbrev: string; id: string };

export async function GET(_req: Request, { params }: { params: Promise<Params> }) {
  try {
    const { id } = await params;
    const repo = new MongoDiscussionRepository();
    const useCase = new GetDiscussionByIdUseCase(repo);
    const discussion = await useCase.execute(id);
    if (!discussion) return notFound("Discussão não encontrada");
    return NextResponse.json(discussion);
  } catch {
    return serverError();
  }
}
