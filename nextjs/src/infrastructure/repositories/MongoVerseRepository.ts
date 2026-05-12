import { conditionalCache } from "@/lib/conditional-cache";
import { IVerseRepository } from "@/domain/repositories/IVerseRepository";
import { Verse } from "@/domain/entities/Verse";
import { VerseModel, IVerseDocument } from "@/infrastructure/database/models/VerseModel";
import { connectToDatabase } from "@/infrastructure/database/connection";
import mongoose from "mongoose";

function toEntity(doc: IVerseDocument): Verse {
  return {
    _id: doc._id?.toString(),
    reference: doc.reference,
    abbrev: doc.abbrev,
    chapter: doc.chapter,
    verseNumber: doc.verseNumber,
    text: doc.text,
  };
}

// Verses are immutable bible text seeded once. Memoize the two hot reads
// behind Next's Data Cache; bust with `revalidateTag("verses")` from the
// seeder when re-loading the corpus. Module-scope keeps the wrapped
// function identity stable so subsequent calls hit the cache.
const findByAbbrevAndChapterCached = conditionalCache(
  async (abbrev: string, chapter: number): Promise<Verse[]> => {
    await connectToDatabase();
    const docs = await VerseModel.find({ abbrev, chapter }).sort({ verseNumber: 1 });
    return docs.map(toEntity);
  },
  ["verses-findByAbbrevAndChapter"],
  { revalidate: 86400, tags: ["verses"] },
);

const findByIdCached = conditionalCache(
  async (id: string): Promise<Verse | null> => {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    await connectToDatabase();
    const doc = await VerseModel.findById(id);
    return doc ? toEntity(doc) : null;
  },
  ["verses-findById"],
  { revalidate: 86400, tags: ["verses"] },
);

export class MongoVerseRepository implements IVerseRepository {
  async findByAbbrevAndChapter(abbrev: string, chapter: number): Promise<Verse[]> {
    return findByAbbrevAndChapterCached(abbrev, chapter);
  }

  async findById(id: string): Promise<Verse | null> {
    return findByIdCached(id);
  }

  async findManyByIds(ids: string[]): Promise<Verse[]> {
    if (ids.length === 0) return [];
    await connectToDatabase();
    const oids = ids
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));
    if (oids.length === 0) return [];
    const docs = await VerseModel.find({ _id: { $in: oids } });
    return docs.map(toEntity);
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

  async create(verse: Omit<Verse, "_id">): Promise<Verse> {
    await connectToDatabase();
    const doc = await VerseModel.create(verse);
    return toEntity(doc);
  }

  async update(id: string, data: Partial<Pick<Verse, "text" | "reference">>): Promise<Verse | null> {
    await connectToDatabase();
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const doc = await VerseModel.findByIdAndUpdate(id, { $set: data }, { returnDocument: "after" });
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
