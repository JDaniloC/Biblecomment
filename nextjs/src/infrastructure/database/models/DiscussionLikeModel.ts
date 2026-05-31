import mongoose, { Schema, Document, Model } from "mongoose";

export type DiscussionLikeTargetType = "discussion" | "answer";

export interface IDiscussionLikeDocument extends Document {
	userId: string;
	targetType: DiscussionLikeTargetType;
	targetId: mongoose.Types.ObjectId;
	createdAt: Date;
}

// One polymorphic collection for both discussion-level and answer-level likes.
// (userId, targetType, targetId) is unique so a like is idempotent; the
// (targetType, targetId) index backs the batch count/whichLiked queries.
const DiscussionLikeSchema = new Schema<IDiscussionLikeDocument>(
	{
		userId: { type: String, required: true },
		targetType: {
			type: String,
			required: true,
			enum: ["discussion", "answer"],
		},
		targetId: { type: Schema.Types.ObjectId, required: true },
		createdAt: { type: Date, required: true, default: () => new Date() },
	},
	{ timestamps: false },
);

DiscussionLikeSchema.index(
	{ userId: 1, targetType: 1, targetId: 1 },
	{ unique: true },
);
DiscussionLikeSchema.index({ targetType: 1, targetId: 1 });

export const DiscussionLikeModel: Model<IDiscussionLikeDocument> =
	mongoose.models.DiscussionLike ||
	mongoose.model<IDiscussionLikeDocument>(
		"DiscussionLike",
		DiscussionLikeSchema,
	);
