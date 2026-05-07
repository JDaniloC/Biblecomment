import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICommentDocument extends Document {
  sourceId?: number;
  verseId: mongoose.Types.ObjectId;
  username: string;
  onTitle: boolean;
  bookReference: string;
  text: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Likes (Phase 9.1) and reports (Phase 9.2) live in their own join
// collections — see CommentLikeModel / CommentReportModel. The schema
// deliberately omits the legacy fields so old docs upgrade lazily.
const CommentSchema = new Schema<ICommentDocument>(
  {
    sourceId:      { type: Number },
    verseId:       { type: Schema.Types.ObjectId, ref: "Verse", required: true },
    username:      { type: String, required: true },
    onTitle:       { type: Boolean, default: false },
    bookReference: { type: String, required: true },
    text:          { type: String, required: true },
    tags:          { type: [String], default: [] },
  },
  { timestamps: true }
);

CommentSchema.index({ sourceId: 1 }, { unique: true, sparse: true });
CommentSchema.index({ verseId: 1, onTitle: 1 });
CommentSchema.index({ username: 1 });
CommentSchema.index({ text: "text" });

export const CommentModel: Model<ICommentDocument> =
  mongoose.models.Comment || mongoose.model<ICommentDocument>("Comment", CommentSchema);
