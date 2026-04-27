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
  answers: Array<{ _id?: mongoose.Types.ObjectId; name: string; text: string }>;
  createdAt: Date;
  updatedAt: Date;
}

const AnswerSchema = new Schema(
  {
    name: { type: String, required: true },
    text: { type: String, required: true },
  },
  // _id default true: each answer gets an ObjectId so it can be edited
  // or referenced individually. Pre-existing answers from the legacy
  // SQLite migration lack _id and remain uneditable — acceptable
  // limitation, surfaces as 404 if attempted.
  { _id: true, timestamps: true },
);

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
