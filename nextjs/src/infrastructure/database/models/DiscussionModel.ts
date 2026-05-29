import mongoose, { Schema, Document, Model } from "mongoose";

export interface IDiscussionDocument extends Document {
  sourceId?: number;
  bookAbbrev: string;
  commentId?: mongoose.Types.ObjectId;
  username: string;
  verseReference: string;
  verseText: string;
  commentText: string;
  quoteStart?: number;
  quoteEnd?: number;
  title: string;
  question: string;
  createdAt: Date;
  updatedAt: Date;
}

// Answers were extracted into a separate collection (see DiscussionAnswerModel).
// The schema deliberately omits the legacy `answers: [...]` field so old
// docs upgrade lazily — Mongoose ignores unknown keys with strict (default).
const DiscussionSchema = new Schema<IDiscussionDocument>(
  {
    sourceId:       { type: Number },
    bookAbbrev:     { type: String, required: true },
    commentId:      { type: Schema.Types.ObjectId, ref: "Comment" },
    username:       { type: String, required: true },
    verseReference: { type: String, required: true },
    // verseText and commentText are descriptive context that may be
    // empty (the user can omit them in the discussion form). The Zod
    // schema defaults them to "" — without this relaxation the Mongoose
    // required check rejects the empty string and throws a 500.
    verseText:      { type: String, default: "" },
    commentText:    { type: String, default: "" },
    // Optional highlighted excerpt offsets into commentText.
    quoteStart:     { type: Number },
    quoteEnd:       { type: Number },
    // One-line headline. Defaults to "" so legacy docs upgrade lazily.
    title:          { type: String, default: "" },
    question:       { type: String, required: true },
  },
  { timestamps: true }
);

DiscussionSchema.index({ sourceId: 1 }, { unique: true, sparse: true });
DiscussionSchema.index({ bookAbbrev: 1 });
DiscussionSchema.index({ username: 1 });

export const DiscussionModel: Model<IDiscussionDocument> =
  mongoose.models.Discussion ||
  mongoose.model<IDiscussionDocument>("Discussion", DiscussionSchema);
