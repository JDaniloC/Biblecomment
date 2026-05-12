import { NextResponse } from "next/server";
import { MongoNotificationRepository } from "@/infrastructure/repositories/MongoNotificationRepository";
import { MarkNotificationReadUseCase } from "@/application/use-cases/NotificationUseCases";
import { getSessionUser, unauthorized, notFound, serverError } from "@/lib/get-session";

type Params = { id: string };

export const dynamic = "force-dynamic";

export async function PATCH(_req: Request, { params }: { params: Promise<Params> }) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const { id } = await params;
    const repo = new MongoNotificationRepository();
    const useCase = new MarkNotificationReadUseCase(repo);
    const updated = await useCase.execute(id, user.username);
    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof Error && err.message === "Notification not found") {
      return notFound("Notification not found");
    }
    return serverError(err);
  }
}
