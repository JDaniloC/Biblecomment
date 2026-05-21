import mongoose, { Schema, Document, Model } from "mongoose";

export interface IReadingSessionDocument extends Document {
	userId: string;
	date: string;
	createdAt?: Date;
}

const ReadingSessionSchema = new Schema<IReadingSessionDocument>(
	{
		userId: { type: String, required: true },
		date: { type: String, required: true },
	},
	{ timestamps: true },
);

// One row per user per day — the upsert in registerToday relies on this.
ReadingSessionSchema.index({ userId: 1, date: 1 }, { unique: true });

export const ReadingSessionModel: Model<IReadingSessionDocument> =
	mongoose.models.ReadingSession ||
	mongoose.model<IReadingSessionDocument>(
		"ReadingSession",
		ReadingSessionSchema,
	);
