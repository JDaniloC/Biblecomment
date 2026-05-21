import type {
	IReadingReminderPreferenceRepository,
} from "@/domain/repositories/IReadingReminderPreferenceRepository";
import type { ReadingReminderPreference } from "@/domain/entities/ReadingReminderPreference";
import {
	ReadingReminderPreferenceModel,
	type IReadingReminderPreferenceDocument,
} from "@/infrastructure/database/models/ReadingReminderPreferenceModel";
import { connectToDatabase } from "@/infrastructure/database/connection";

function toEntity(doc: IReadingReminderPreferenceDocument): ReadingReminderPreference {
	return {
		_id: doc._id?.toString(),
		username: doc.username,
		enabled: doc.enabled,
		hourLocal: doc.hourLocal,
		tz: doc.tz,
		lastSentAt: doc.lastSentAt,
		createdAt: doc.createdAt,
		updatedAt: doc.updatedAt,
	};
}

export class MongoReadingReminderPreferenceRepository
	implements IReadingReminderPreferenceRepository
{
	async findByUsername(
		username: string,
	): Promise<ReadingReminderPreference | null> {
		await connectToDatabase();
		const doc = await ReadingReminderPreferenceModel.findOne({ username });
		return doc ? toEntity(doc) : null;
	}

	async upsert(
		pref: Omit<ReadingReminderPreference, "_id" | "createdAt" | "updatedAt">,
	): Promise<ReadingReminderPreference> {
		await connectToDatabase();
		const doc = await ReadingReminderPreferenceModel.findOneAndUpdate(
			{ username: pref.username },
			{
				$set: {
					enabled: pref.enabled,
					hourLocal: pref.hourLocal,
					tz: pref.tz,
					// `lastSentAt` is intentionally NOT touched here — the scheduler
					// owns that field. Toggling enabled or changing the hour must
					// not retroactively suppress (or trigger) today's reminder.
				},
			},
			{ upsert: true, new: true, setDefaultsOnInsert: true },
		);
		return toEntity(doc);
	}

	async findEnabledForSlots(
		slots: number[],
	): Promise<ReadingReminderPreference[]> {
		if (slots.length === 0) return [];
		await connectToDatabase();
		const docs = await ReadingReminderPreferenceModel.find({
			enabled: true,
			hourLocal: { $in: slots },
		});
		return docs.map(toEntity);
	}

	async markSent(username: string, sentAt: Date): Promise<void> {
		await connectToDatabase();
		await ReadingReminderPreferenceModel.updateOne(
			{ username },
			{ $set: { lastSentAt: sentAt } },
		);
	}
}
