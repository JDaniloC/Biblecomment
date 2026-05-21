import type { IReadingReminderPreferenceRepository } from "@/domain/repositories/IReadingReminderPreferenceRepository";
import {
	DEFAULT_REMINDER_HOUR,
	DEFAULT_REMINDER_TZ,
	type ReadingReminderPreference,
} from "@/domain/entities/ReadingReminderPreference";

export class GetReadingReminderUseCase {
	constructor(
		private readonly repo: IReadingReminderPreferenceRepository,
	) {}

	/** Returns the user's pref, falling back to a disabled default so the
	 *  UI can render a sensible form for users who never opted in. */
	async execute(username: string): Promise<ReadingReminderPreference> {
		const existing = await this.repo.findByUsername(username);
		if (existing) return existing;
		return {
			username,
			enabled: false,
			hourLocal: DEFAULT_REMINDER_HOUR,
			tz: DEFAULT_REMINDER_TZ,
		};
	}
}

export class UpdateReadingReminderUseCase {
	constructor(
		private readonly repo: IReadingReminderPreferenceRepository,
	) {}

	async execute(input: {
		username: string;
		enabled: boolean;
		hourLocal: number;
		tz?: string;
	}): Promise<ReadingReminderPreference> {
		if (
			!Number.isFinite(input.hourLocal) ||
			input.hourLocal < 0 ||
			input.hourLocal > 23.5
		) {
			throw new Error("hourLocal must be in [0, 23.5]");
		}
		// Enforce the half-hour grid — anything off-grid is a client bug or
		// someone hitting the API directly with a typo.
		if ((input.hourLocal * 2) % 1 !== 0) {
			throw new Error("hourLocal must be a multiple of 0.5");
		}
		return this.repo.upsert({
			username: input.username,
			enabled: input.enabled,
			hourLocal: input.hourLocal,
			tz: input.tz ?? DEFAULT_REMINDER_TZ,
		});
	}
}
