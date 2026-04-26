import { NextResponse } from "next/server";
import { MongoDiscussionRepository } from "@/infrastructure/repositories/MongoDiscussionRepository";
import { GetAllDiscussionsPaginatedUseCase } from "@/application/use-cases/DiscussionUseCases";
import { serverError } from "@/lib/get-session";

const PAGE_SIZE = 5;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("pages") ?? "1", 10);

    const repo = new MongoDiscussionRepository();
    const useCase = new GetAllDiscussionsPaginatedUseCase(repo);
    return NextResponse.json(await useCase.execute(page, PAGE_SIZE));
  } catch {
    return serverError();
  }
}
