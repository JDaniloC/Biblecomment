import { NextResponse } from "next/server";
import { MongoReadingReminderPreferenceRepository } from "@/infrastructure/repositories/MongoReadingReminderPreferenceRepository";
import { MongoPushSubscriptionRepository } from "@/infrastructure/repositories/MongoPushSubscriptionRepository";
import { MongoAppConfigRepository } from "@/infrastructure/repositories/MongoAppConfigRepository";
import { PushNotificationService } from "@/application/services/PushNotificationService";
import { webPushSender } from "@/infrastructure/push/WebPushSender";
import { SendDailyRemindersUseCase } from "@/application/use-cases/SendDailyRemindersUseCase";
import {
	bookChapterToIndex,
	type ReadingPlanAnchor,
} from "@/lib/reading-plan";

export const dynamic = "force-dynamic";

const ANCHOR_CONFIG_KEY = "reading-plan";

interface StoredAnchor {
	anchorDate: string;
	anchorBook: string;
	anchorChapter: number;
}

/** Resolve the moderator-editable anchor; null → use-case falls back to
 *  the compiled DEFAULT_ANCHOR. */
async function resolveAnchor(): Promise<ReadingPlanAnchor | undefined> {
	try {
		const stored = await new MongoAppConfigRepository().get<StoredAnchor>(
			ANCHOR_CONFIG_KEY,
		);
		if (!stored) return undefined;
		const idx = bookChapterToIndex(stored.anchorBook, stored.anchorChapter);
		if (idx === null) return undefined;
		const [y, m, d] = stored.anchorDate.split("-").map((n) => parseInt(n, 10));
		if ([y, m, d].some((n) => Number.isNaN(n))) return undefined;
		return { anchorDateUtc: Date.UTC(y, m - 1, d), anchorIndex: idx };
	} catch {
		return undefined;
	}
}

/**
 * Cron entrypoint for the daily reading reminder. Invoked every 30 min
 * by the Netlify scheduled function, which forwards the shared secret in
 * the `x-cron-secret` header. Refuses to run if `CRON_SECRET` is unset
 * (misconfiguration must fail loud, not run unauthenticated).
 */
export async function POST(req: Request) {
	const secret = process.env.CRON_SECRET;
	if (!secret) {
		return NextResponse.json(
			{ error: "CRON_SECRET not configured" },
			{ status: 503 },
		);
	}
	if (req.headers.get("x-cron-secret") !== secret) {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	}

	try {
		const anchor = await resolveAnchor();
		const useCase = new SendDailyRemindersUseCase(
			new MongoReadingReminderPreferenceRepository(),
			new PushNotificationService(
				new MongoPushSubscriptionRepository(),
				webPushSender,
			),
		);
		const result = await useCase.execute({ now: new Date(), anchor });
		return NextResponse.json(result);
	} catch (err) {
		return NextResponse.json(
			{ error: err instanceof Error ? err.message : "send-reminders failed" },
			{ status: 500 },
		);
	}
}
