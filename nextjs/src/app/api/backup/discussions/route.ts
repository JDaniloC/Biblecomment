import { NextResponse } from "next/server";
import { MongoDiscussionRepository } from "@/infrastructure/repositories/MongoDiscussionRepository";
import {
  BackupDiscussionsUseCase,
  ImportDiscussionsUseCase,
} from "@/application/use-cases/BackupUseCases";
import { getSessionUser, forbidden, serverError } from "@/lib/get-session";
import { parseBody } from "@/lib/parse-body";
import { BackupDiscussionsSchema } from "@/lib/schemas";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user?.moderator) return forbidden();

    const repo = new MongoDiscussionRepository();
    const useCase = new BackupDiscussionsUseCase(repo);
    return NextResponse.json(await useCase.execute());
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user?.moderator) return forbidden();

    const parsed = await parseBody(req, BackupDiscussionsSchema);
    if (!parsed.ok) return parsed.response;

    const useCase = new ImportDiscussionsUseCase(new MongoDiscussionRepository());
    const imported = await useCase.execute(parsed.data.discussions);
    return NextResponse.json({ imported }, { status: 201 });
  } catch (err) {
    return serverError(err);
  }
}
