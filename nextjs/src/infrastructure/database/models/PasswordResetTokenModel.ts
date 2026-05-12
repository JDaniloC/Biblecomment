import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPasswordResetTokenDocument extends Document {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  createdAt?: Date;
}

const PasswordResetTokenSchema = new Schema<IPasswordResetTokenDocument>(
  {
    userId:    { type: String, required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date,   required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

PasswordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const PasswordResetTokenModel: Model<IPasswordResetTokenDocument> =
  mongoose.models.PasswordResetToken ||
  mongoose.model<IPasswordResetTokenDocument>("PasswordResetToken", PasswordResetTokenSchema);
