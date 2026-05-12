import { NextResponse } from "next/server";
import { MongoDiscussionRepository } from "@/infrastructure/repositories/MongoDiscussionRepository";
import { MongoDiscussionAnswerRepository } from "@/infrastructure/repositories/MongoDiscussionAnswerRepository";
import { GetActiveDiscussionsUseCase } from "@/application/use-cases/FeedUseCases";
import { serverError } from "@/lib/get-session";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT),
    );

    const useCase = new GetActiveDiscussionsUseCase(
      new MongoDiscussionRepository(),
      new MongoDiscussionAnswerRepository(),
    );
    const result = await useCase.execute({ limit });

    return NextResponse.json({ items: result.items });
  } catch (err) {
    return serverError(err);
  }
}
