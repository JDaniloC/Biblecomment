import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUserChapterReadDocument extends Document {
  userId: string;
  abbrev: string;
  chapter: number;
  readAt: Date;
}

const UserChapterReadSchema = new Schema<IUserChapterReadDocument>(
  {
    userId:  { type: String, required: true },
    abbrev:  { type: String, required: true, lowercase: true, trim: true },
    chapter: { type: Number, required: true, min: 1 },
    readAt:  { type: Date,   required: true, default: () => new Date() },
  },
  { timestamps: false },
);

UserChapterReadSchema.index(
  { userId: 1, abbrev: 1, chapter: 1 },
  { unique: true },
);
UserChapterReadSchema.index({ userId: 1, abbrev: 1 });

export const UserChapterReadModel: Model<IUserChapterReadDocument> =
  mongoose.models.UserChapterRead ||
  mongoose.model<IUserChapterReadDocument>("UserChapterRead", UserChapterReadSchema);
