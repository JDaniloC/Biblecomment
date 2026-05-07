import { NextResponse } from "next/server";
import { MongoDiscussionRepository } from "@/infrastructure/repositories/MongoDiscussionRepository";
import { MongoDiscussionAnswerRepository } from "@/infrastructure/repositories/MongoDiscussionAnswerRepository";
import { GetAllDiscussionsPaginatedUseCase } from "@/application/use-cases/DiscussionUseCases";
import { serverError } from "@/lib/get-session";

const PAGE_SIZE = 5;

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("pages") ?? "1", 10);

    // List page consumer (DiscussionsClient) reads `answersCount` only —
    // hydrating the answer repo enriches each row via batch aggregation.
    const useCase = new GetAllDiscussionsPaginatedUseCase(
      new MongoDiscussionRepository(),
      new MongoDiscussionAnswerRepository(),
    );
    return NextResponse.json(await useCase.execute(page, PAGE_SIZE));
  } catch (err) {
    return serverError(err);
  }
}
