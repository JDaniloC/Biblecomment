import mongoose, { Schema, Document, Model } from "mongoose";

export interface IVerseDocument extends Document {
  reference?: string;
  abbrev: string;
  chapter: number;
  verseNumber: number;
  text: string;
}

const VerseSchema = new Schema<IVerseDocument>({
  reference:   { type: String },
  abbrev:      { type: String, required: true },
  chapter:     { type: Number, required: true },
  verseNumber: { type: Number, required: true },
  text:        { type: String, required: true },
});

VerseSchema.index({ abbrev: 1, chapter: 1 });
VerseSchema.index({ abbrev: 1, chapter: 1, verseNumber: 1 }, { unique: true });
VerseSchema.index({ text: "text" });

export const VerseModel: Model<IVerseDocument> =
  mongoose.models.Verse || mongoose.model<IVerseDocument>("Verse", VerseSchema);
