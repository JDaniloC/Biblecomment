import mongoose, { Schema, Document, Model } from "mongoose";

export interface IBookDocument extends Document {
  abbrev: string;
  author: string;
  backdrop?: string;
  chapters: number;
  comment?: string;
  group: string;
  name: string;
  testament: string;
}

const BookSchema = new Schema<IBookDocument>({
  abbrev:    { type: String, required: true, unique: true, trim: true },
  author:    { type: String, required: true },
  backdrop:  { type: String },
  chapters:  { type: Number, required: true },
  comment:   { type: String },
  group:     { type: String, required: true },
  name:      { type: String, required: true },
  testament: { type: String, required: true },
});

BookSchema.index({ testament: 1 });
BookSchema.index({ group: 1 });

export const BookModel: Model<IBookDocument> =
  mongoose.models.Book || mongoose.model<IBookDocument>("Book", BookSchema);
