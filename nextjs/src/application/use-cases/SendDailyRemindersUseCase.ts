import type { IReadingReminderPreferenceRepository } from "@/domain/repositories/IReadingReminderPreferenceRepository";
import type { PushNotificationService } from "@/application/services/PushNotificationService";
import { shouldSendNow } from "@/lib/reminder-scheduler";
import {
	getReadingForDate,
	type ReadingPlanAnchor,
} from "@/lib/reading-plan";

export interface SendDailyRemindersResult {
	/** Opted-in rows examined. */
	processed: number;
	/** Reminders actually pushed. */
	sent: number;
	/** Rows whose slot didn't match or that already got today's reminder. */
	skipped: number;
}

/**
 * Cron-driven daily reading reminder. Runs every 30 minutes; for each
 * opted-in preference whose local time matches the chosen slot and that
 * hasn't been sent today, fans a Web Push out with today's RPSP chapter
 * and stamps `lastSentAt`.
 *
 * Push delivery is best-effort (PushNotificationService never throws);
 * `markSent` runs only after a send is attempted so a transient failure
 * gets retried on the next 30-minute tick within the same slot window.
 */
export class SendDailyRemindersUseCase {
	constructor(
		private readonly reminders: IReadingReminderPreferenceRepository,
		private readonly push: PushNotificationService,
	) {}

	async execute(opts: {
		now: Date;
		anchor?: ReadingPlanAnchor;
	}): Promise<SendDailyRemindersResult> {
		const prefs = await this.reminders.findAllEnabled();
		const reading = getReadingForDate(opts.now, opts.anchor);

		let sent = 0;
		let skipped = 0;

		for (const pref of prefs) {
			const ready = shouldSendNow({
				now: opts.now,
				tz: pref.tz,
				hourLocal: pref.hourLocal,
				lastSentAt: pref.lastSentAt,
			});
			if (!ready) {
				skipped++;
				continue;
			}

			await this.push.sendToUser(pref.username, {
				title: "Leitura de hoje",
				body: `${reading.bookName} ${reading.chapter} — ${reading.cycleLabel}`,
				url: `/verses/${reading.abbrev}/${reading.chapter}`,
				tag: "reading-reminder",
			});
			await this.reminders.markSent(pref.username, opts.now);
			sent++;
		}

		return { processed: prefs.length, sent, skipped };
	}
}
