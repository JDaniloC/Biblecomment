import mongoose, { Schema, Document, Model } from "mongoose";

export interface IDiscussionDocument extends Document {
  sourceId?: number;
  bookAbbrev: string;
  commentId?: mongoose.Types.ObjectId;
  username: string;
  verseReference: string;
  verseText: string;
  commentText: string;
  question: string;
  answers: Array<{ name: string; text: string }>;
  createdAt: Date;
  updatedAt: Date;
}

const AnswerSchema = new Schema(
  {
    name: { type: String, required: true },
    text: { type: String, required: true },
  },
  { _id: false }
);

const DiscussionSchema = new Schema<IDiscussionDocument>(
  {
    sourceId:       { type: Number },
    bookAbbrev:     { type: String, required: true },
    commentId:      { type: Schema.Types.ObjectId, ref: "Comment" },
    username:       { type: String, required: true },
    verseReference: { type: String, required: true },
    verseText:      { type: String, required: true },
    commentText:    { type: String, required: true },
    question:       { type: String, required: true },
    answers:        { type: [AnswerSchema], default: [] },
  },
  { timestamps: true }
);

DiscussionSchema.index({ sourceId: 1 }, { unique: true, sparse: true });
DiscussionSchema.index({ bookAbbrev: 1 });
DiscussionSchema.index({ username: 1 });

export const DiscussionModel: Model<IDiscussionDocument> =
  mongoose.models.Discussion ||
  mongoose.model<IDiscussionDocument>("Discussion", DiscussionSchema);
