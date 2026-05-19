import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICommunityMembershipDocument extends Document {
  userId: string;
  communityId: string;
  status: "pending" | "approved";
  role: "member" | "moderator";
  joinedAt?: Date;
}

const CommunityMembershipSchema = new Schema<ICommunityMembershipDocument>(
  {
    userId: { type: String, required: true, index: true },
    communityId: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ["pending", "approved"],
      default: "pending",
      required: true,
    },
    role: {
      type: String,
      enum: ["member", "moderator"],
      default: "member",
      required: true,
    },
  },
  { timestamps: { createdAt: "joinedAt", updatedAt: false } },
);

// Composite unique guard so concurrent joins collapse to one row — same
// pattern used by FollowModel.
CommunityMembershipSchema.index({ userId: 1, communityId: 1 }, { unique: true });
CommunityMembershipSchema.index({ communityId: 1, status: 1 });
CommunityMembershipSchema.index({ communityId: 1, role: 1 });

export const CommunityMembershipModel: Model<ICommunityMembershipDocument> =
  mongoose.models.CommunityMembership ||
  mongoose.model<ICommunityMembershipDocument>(
    "CommunityMembership",
    CommunityMembershipSchema,
  );
