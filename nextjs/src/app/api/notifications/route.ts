import { NextResponse } from "next/server";
import { MongoNotificationRepository } from "@/infrastructure/repositories/MongoNotificationRepository";
import {
  GetUserNotificationsUseCase,
  MarkAllNotificationsReadUseCase,
} from "@/application/use-cases/NotificationUseCases";
import { getSessionUser, unauthorized, serverError } from "@/lib/get-session";

const PAGE_SIZE = 20;

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);

    const repo = new MongoNotificationRepository();
    const useCase = new GetUserNotificationsUseCase(repo);
    const { items, unread } = await useCase.execute(user.username, page, PAGE_SIZE);

    return NextResponse.json({ page, pageSize: PAGE_SIZE, items, unread });
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    if (action !== "mark-all-read") {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    const repo = new MongoNotificationRepository();
    const useCase = new MarkAllNotificationsReadUseCase(repo);
    const updated = await useCase.execute(user.username);
    return NextResponse.json({ updated });
  } catch (err) {
    return serverError(err);
  }
}
