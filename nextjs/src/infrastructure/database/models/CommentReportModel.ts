import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICommentReportDocument extends Document {
  userId: string;
  username: string;
  commentId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const CommentReportSchema = new Schema<ICommentReportDocument>(
  {
    userId:    { type: String, required: true },
    username:  { type: String, required: true },
    commentId: { type: Schema.Types.ObjectId, ref: "Comment", required: true },
    createdAt: { type: Date,   required: true, default: () => new Date() },
  },
  { timestamps: false },
);

CommentReportSchema.index({ userId: 1, commentId: 1 }, { unique: true });
CommentReportSchema.index({ commentId: 1 });

export const CommentReportModel: Model<ICommentReportDocument> =
  mongoose.models.CommentReport ||
  mongoose.model<ICommentReportDocument>("CommentReport", CommentReportSchema);
