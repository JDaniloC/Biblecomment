import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICommunityDocument extends Document {
  slug: string;
  name: string;
  description: string;
  createdBy: string;
  memberCount: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const CommunitySchema = new Schema<ICommunityDocument>(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /^[a-z0-9-]{2,40}$/,
    },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    description: { type: String, default: "", trim: true, maxlength: 500 },
    createdBy: { type: String, required: true, index: true },
    memberCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

// Case-insensitive name search for the discovery page.
CommunitySchema.index({ name: "text" });

export const CommunityModel: Model<ICommunityDocument> =
  mongoose.models.Community ||
  mongoose.model<ICommunityDocument>("Community", CommunitySchema);
