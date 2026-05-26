import mongoose, { Schema, Document, Model } from "mongoose";

export interface IEmailVerificationTokenDocument extends Document {
  userId: string;
  email: string;
  tokenHash: string;
  expiresAt: Date;
  createdAt?: Date;
}

const EmailVerificationTokenSchema = new Schema<IEmailVerificationTokenDocument>(
  {
    userId:    { type: String, required: true, index: true },
    email:     { type: String, required: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date,   required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

EmailVerificationTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const EmailVerificationTokenModel: Model<IEmailVerificationTokenDocument> =
  mongoose.models.EmailVerificationToken ||
  mongoose.model<IEmailVerificationTokenDocument>("EmailVerificationToken", EmailVerificationTokenSchema);
