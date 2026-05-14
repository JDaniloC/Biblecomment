import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICommunityMembershipDocument extends Document {
  userId: string;
  communityId: string;
  joinedAt?: Date;
}

const CommunityMembershipSchema = new Schema<ICommunityMembershipDocument>(
  {
    userId: { type: String, required: true, index: true },
    communityId: { type: String, required: true, index: true },
  },
  { timestamps: { createdAt: "joinedAt", updatedAt: false } },
);

// Composite unique guard so concurrent joins collapse to one row — same
// pattern used by FollowModel.
CommunityMembershipSchema.index({ userId: 1, communityId: 1 }, { unique: true });

export const CommunityMembershipModel: Model<ICommunityMembershipDocument> =
  mongoose.models.CommunityMembership ||
  mongoose.model<ICommunityMembershipDocument>(
    "CommunityMembership",
    CommunityMembershipSchema,
  );
