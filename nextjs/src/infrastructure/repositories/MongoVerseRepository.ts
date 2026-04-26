import { IVerseRepository } from "@/domain/repositories/IVerseRepository";
import { Verse } from "@/domain/entities/Verse";
import { VerseModel, IVerseDocument } from "@/infrastructure/database/models/VerseModel";
import { connectToDatabase } from "@/infrastructure/database/connection";
import mongoose from "mongoose";

function toEntity(doc: IVerseDocument): Verse {
  return {
    _id: doc._id.toString(),
    reference: doc.reference,
    abbrev: doc.abbrev,
    chapter: doc.chapter,
    verseNumber: doc.verseNumber,
    text: doc.text,
  };
}

export class MongoVerseRepository implements IVerseRepository {
  async findByAbbrevAndChapter(abbrev: string, chapter: number): Promise<Verse[]> {
    await connectToDatabase();
    const docs = await VerseModel.find({ abbrev, chapter }).sort({ verseNumber: 1 });
    return docs.map(toEntity);
  }

  async findById(id: string): Promise<Verse | null> {
    await connectToDatabase();
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const doc = await VerseModel.findById(id);
    return doc ? toEntity(doc) : null;
  }

  async findByAbbrevChapterVerse(
    abbrev: string,
    chapter: number,
    verseNumber: number
  ): Promise<Verse | null> {
    await connectToDatabase();
    const doc = await VerseModel.findOne({ abbrev, chapter, verseNumber });
    return doc ? toEntity(doc) : null;
  }

  async searchByText(query: string, limit = 50): Promise<Verse[]> {
    await connectToDatabase();
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const docs = await VerseModel.find({
      text: { $regex: escaped, $options: "i" },
    })
      .limit(limit)
      .sort({ abbrev: 1, chapter: 1, verseNumber: 1 });
    return docs.map(toEntity);
  }
}
