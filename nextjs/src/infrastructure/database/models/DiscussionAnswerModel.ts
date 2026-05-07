import mongoose, { Schema, Document, Model } from "mongoose";

export interface IDiscussionAnswerDocument extends Document {
  discussionId: mongoose.Types.ObjectId;
  userId: string;
  username: string;
  text: string;
  createdAt: Date;
  updatedAt: Date;
}

const DiscussionAnswerSchema = new Schema<IDiscussionAnswerDocument>(
  {
    discussionId: { type: Schema.Types.ObjectId, ref: "Discussion", required: true },
    userId:       { type: String, required: true },
    username:     { type: String, required: true },
    text:         { type: String, required: true },
  },
  { timestamps: true },
);

DiscussionAnswerSchema.index({ discussionId: 1, createdAt: 1 });
DiscussionAnswerSchema.index({ userId: 1 });

export const DiscussionAnswerModel: Model<IDiscussionAnswerDocument> =
  mongoose.models.DiscussionAnswer ||
  mongoose.model<IDiscussionAnswerDocument>("DiscussionAnswer", DiscussionAnswerSchema);
