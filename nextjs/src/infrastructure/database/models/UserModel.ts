import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUserDocument extends Document {
  email: string;
  username: string;
  displayName?: string;
  password: string;
  state?: string;
  belief?: string;
  showBelief?: boolean;
  moderator?: boolean;
  tutorialsCompleted?: string[];
  badges?: string[];
  disabledAt?: Date;
  disabledBy?: string;
  emailVerifiedAt?: Date;
  pendingEmail?: string;
  renameFrom?: string;
  deletion?: {
    requestedAt: Date;
    communityIds: string[];
    discussionIds: string[];
  };
  sessionVersion?: number;
  /** Set by Mongoose `timestamps: true` on the schema. */
  createdAt?: Date;
  updatedAt?: Date;
}

const UserSchema = new Schema<IUserDocument>(
  {
    email:              { type: String, required: true, unique: true, lowercase: true, trim: true },
    username:           { type: String, required: true, trim: true },
    displayName:        { type: String, trim: true },
    password:           { type: String, required: true },
    state:              { type: String },
    belief:             { type: String },
    showBelief:         { type: Boolean, default: false },
    moderator:          { type: Boolean, default: false },
    tutorialsCompleted: { type: [String], default: [] },
    badges:             { type: [String], default: [] },
    disabledAt:         { type: Date },
    disabledBy:         { type: String },
    emailVerifiedAt:    { type: Date, required: false },
    pendingEmail:       { type: String, required: false, lowercase: true, trim: true },
    // Previous username while a rename cascade is unfinished (see
    // UpdateUsernameUseCase); the old slug stays unavailable until then.
    renameFrom:         { type: String, required: false },
    // Deletion-in-progress snapshot (see User.deletion). Declared so strict
    // mode keeps the $min/$addToSet writes in beginDeletion.
    deletion: {
      type: new Schema(
        {
          requestedAt:   { type: Date, required: true },
          communityIds:  { type: [String], default: [] },
          discussionIds: { type: [String], default: [] },
        },
        { _id: false },
      ),
      required: false,
    },
    // Session revocation counter (see User.sessionVersion). Declared so
    // strict mode keeps the $inc in updatePasswordById / setDisabled.
    sessionVersion:     { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

UserSchema.index({ username: 1 }, { unique: true });
// Sparse — only disabled accounts carry the field, so the index stays tiny.
UserSchema.index({ disabledAt: 1 }, { sparse: true });

export const UserModel: Model<IUserDocument> =
  mongoose.models.User || mongoose.model<IUserDocument>("User", UserSchema);
