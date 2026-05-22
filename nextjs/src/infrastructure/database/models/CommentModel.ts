import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICommentDocument extends Document {
  sourceId?: number;
  verseId: mongoose.Types.ObjectId;
  username: string;
  onTitle: boolean;
  bookReference: string;
  text: string;
  tags: string[];
  communitySlug?: string;
  verified?: boolean;
  verifiedBy?: string;
  verifiedAt?: Date;
  hiddenAt?: Date;
  hiddenBy?: string;
  hiddenReason?: "moderator" | "account-disabled";
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
    communitySlug: { type: String },
    verified:      { type: Boolean, default: false },
    verifiedBy:    { type: String },
    verifiedAt:    { type: Date },
    hiddenAt:      { type: Date },
    hiddenBy:      { type: String },
    hiddenReason:  { type: String, enum: ["moderator", "account-disabled"] },
  },
  { timestamps: true }
);

CommentSchema.index({ sourceId: 1 }, { unique: true, sparse: true });
CommentSchema.index({ verseId: 1, onTitle: 1 });
CommentSchema.index({ username: 1 });
CommentSchema.index({ bookReference: 1 });
// Filter chapter reads by community without rebuilding the verseId index.
// Sparse so the existing geral-only documents don't bloat the index.
CommentSchema.index({ communitySlug: 1, createdAt: -1 }, { sparse: true });
CommentSchema.index({ verseId: 1, communitySlug: 1 }, { sparse: true });
CommentSchema.index({ verified: 1 });
// Sparse — only hidden comments carry the field; lets read paths exclude
// them and the moderation panel filter to them cheaply.
CommentSchema.index({ hiddenAt: 1 }, { sparse: true });
// Newest-first sort for the moderation panel and any feed view.
// Compound on (createdAt, _id) so cursor pagination has a deterministic
// tiebreaker when timestamps collide.
CommentSchema.index({ createdAt: -1, _id: -1 });
// Portuguese stemming for the moderation full-text search. Without a
// language hint, MongoDB defaults to English — "verificação"/"versículo"
// would never match a query for "verifica" / "versic".
CommentSchema.index({ text: "text" }, { default_language: "portuguese" });

export const CommentModel: Model<ICommentDocument> =
  mongoose.models.Comment || mongoose.model<ICommentDocument>("Comment", CommentSchema);
