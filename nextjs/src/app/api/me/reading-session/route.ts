import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { MongoReadingSessionRepository } from "@/infrastructure/repositories/MongoReadingSessionRepository";
import { localDateString } from "@/lib/reminder-scheduler";
import { DEFAULT_REMINDER_TZ } from "@/domain/entities/ReadingReminderPreference";

export const dynamic = "force-dynamic";

/**
 * Registers a reading session for *today* (Brazil time). The client
 * tracker calls this once it has accumulated enough active reading time;
 * the day is decided server-side so the client can't backdate or forge
 * a streak day. Idempotent — repeated calls in the same day are no-ops.
 */
export async function POST() {
	const session = await auth();
	if (!session?.user?.id) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}
	const today = localDateString(new Date(), DEFAULT_REMINDER_TZ);
	await new MongoReadingSessionRepository().registerDay(
		session.user.id,
		today,
	);
	return NextResponse.json({ ok: true, date: today });
}
