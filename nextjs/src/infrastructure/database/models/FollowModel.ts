import mongoose, { Schema, Document, Model } from "mongoose";

export interface IFollowDocument extends Document {
  followerId: string;
  followingId: string;
  createdAt?: Date;
}

const FollowSchema = new Schema<IFollowDocument>(
  {
    followerId: { type: String, required: true, index: true },
    followingId: { type: String, required: true, index: true },
  },
  { timestamps: true },
);

// Composite unique guard so a follower can't double-row the same target. The
// repo also uses upsert + setOnInsert to detect "newly created" — the unique
// index turns a concurrent double-write into a clean upsert.
FollowSchema.index({ followerId: 1, followingId: 1 }, { unique: true });

export const FollowModel: Model<IFollowDocument> =
  mongoose.models.Follow || mongoose.model<IFollowDocument>("Follow", FollowSchema);
