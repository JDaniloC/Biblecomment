import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICommentLikeDocument extends Document {
  userId: string;
  commentId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const CommentLikeSchema = new Schema<ICommentLikeDocument>(
  {
    userId:    { type: String, required: true },
    commentId: { type: Schema.Types.ObjectId, ref: "Comment", required: true },
    createdAt: { type: Date,   required: true, default: () => new Date() },
  },
  { timestamps: false },
);

CommentLikeSchema.index({ userId: 1, commentId: 1 }, { unique: true });
CommentLikeSchema.index({ commentId: 1 });

export const CommentLikeModel: Model<ICommentLikeDocument> =
  mongoose.models.CommentLike ||
  mongoose.model<ICommentLikeDocument>("CommentLike", CommentLikeSchema);
