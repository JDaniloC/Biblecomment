import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICommunityFollowDocument extends Document {
	userId: string;
	communityId: string;
	followedAt?: Date;
}

const CommunityFollowSchema = new Schema<ICommunityFollowDocument>(
	{
		userId: { type: String, required: true, index: true },
		communityId: { type: String, required: true, index: true },
	},
	{ timestamps: { createdAt: "followedAt", updatedAt: false } },
);

// Composite unique guard — repo upsert + setOnInsert relies on this to
// detect "newly created" so the community's followerCount stays in sync
// even under concurrent follow attempts. Same pattern as FollowModel.
CommunityFollowSchema.index({ userId: 1, communityId: 1 }, { unique: true });

export const CommunityFollowModel: Model<ICommunityFollowDocument> =
	mongoose.models.CommunityFollow ||
	mongoose.model<ICommunityFollowDocument>(
		"CommunityFollow",
		CommunityFollowSchema,
	);
