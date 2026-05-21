import mongoose, { Schema, Document, Model } from "mongoose";

export interface IReadingReminderPreferenceDocument extends Document {
	username: string;
	enabled: boolean;
	hourLocal: number;
	tz: string;
	lastSentAt?: Date;
	createdAt?: Date;
	updatedAt?: Date;
}

const ReadingReminderPreferenceSchema =
	new Schema<IReadingReminderPreferenceDocument>(
		{
			username: { type: String, required: true, unique: true },
			enabled: { type: Boolean, required: true, default: false },
			hourLocal: { type: Number, required: true, default: 8, min: 0, max: 23.5 },
			tz: { type: String, required: true, default: "America/Sao_Paulo" },
			lastSentAt: { type: Date },
		},
		{ timestamps: true },
	);

// The scheduler queries by `enabled + hourLocal` every 30 minutes, then
// filters by `lastSentAt`. A compound index on those keys keeps the scan
// proportional to the number of users opted in for that exact slot.
ReadingReminderPreferenceSchema.index({ enabled: 1, hourLocal: 1 });

export const ReadingReminderPreferenceModel: Model<IReadingReminderPreferenceDocument> =
	mongoose.models.ReadingReminderPreference ||
	mongoose.model<IReadingReminderPreferenceDocument>(
		"ReadingReminderPreference",
		ReadingReminderPreferenceSchema,
	);
