import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPushSubscriptionDocument extends Document {
  username: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
  createdAt?: Date;
}

const PushSubscriptionSchema = new Schema<IPushSubscriptionDocument>(
  {
    username:  { type: String, required: true, index: true },
    endpoint:  { type: String, required: true, unique: true },
    p256dh:    { type: String, required: true },
    auth:      { type: String, required: true },
    userAgent: { type: String },
  },
  { timestamps: true },
);

export const PushSubscriptionModel: Model<IPushSubscriptionDocument> =
  mongoose.models.PushSubscription ||
  mongoose.model<IPushSubscriptionDocument>(
    "PushSubscription",
    PushSubscriptionSchema,
  );
