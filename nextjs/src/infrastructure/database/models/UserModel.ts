import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUserDocument extends Document {
  email: string;
  username: string;
  password: string;
  passwordType: "md5" | "bcrypt";
  state?: string;
  belief?: string;
  moderator?: boolean;
  tutorialsCompleted?: string[];
  badges?: string[];
}

const UserSchema = new Schema<IUserDocument>(
  {
    email:              { type: String, required: true, unique: true, lowercase: true, trim: true },
    username:           { type: String, required: true, trim: true },
    password:           { type: String, required: true },
    passwordType:       { type: String, enum: ["md5", "bcrypt"], default: "md5" },
    state:              { type: String },
    belief:             { type: String },
    moderator:          { type: Boolean, default: false },
    tutorialsCompleted: { type: [String], default: [] },
    badges:             { type: [String], default: [] },
  },
  { timestamps: true }
);

UserSchema.index({ username: 1 }, { unique: true });

export const UserModel: Model<IUserDocument> =
  mongoose.models.User || mongoose.model<IUserDocument>("User", UserSchema);
