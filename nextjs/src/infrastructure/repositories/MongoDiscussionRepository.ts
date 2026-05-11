import { IDiscussionRepository } from "@/domain/repositories/IDiscussionRepository";
import { Discussion } from "@/domain/entities/Discussion";
import { DiscussionModel, IDiscussionDocument } from "@/infrastructure/database/models/DiscussionModel";
import { connectToDatabase } from "@/infrastructure/database/connection";
import mongoose from "mongoose";

function toEntity(doc: IDiscussionDocument): Discussion {
  return {
    _id: doc._id?.toString(),
    bookAbbrev: doc.bookAbbrev,
    commentId: doc.commentId?.toString(),
    username: doc.username,
    verseReference: doc.verseReference,
    verseText: doc.verseText,
    commentText: doc.commentText,
    question: doc.question,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export class MongoDiscussionRepository implements IDiscussionRepository {
  async findByBookAbbrev(bookAbbrev: string): Promise<Discussion[]> {
    await connectToDatabase();
    const docs = await DiscussionModel.find({ bookAbbrev }).sort({ createdAt: -1 });
    return docs.map(toEntity);
  }

  async findByBookAbbrevPaginated(bookAbbrev: string, page: number, pageSize: number): Promise<Discussion[]> {
    await connectToDatabase();
    const safePage = Math.max(1, page);
    const safeSize = Math.max(1, Math.min(pageSize, 100));
    const docs = await DiscussionModel.find({ bookAbbrev })
      .sort({ createdAt: -1 })
      .skip((safePage - 1) * safeSize)
      .limit(safeSize);
    return docs.map(toEntity);
  }

  async findById(id: string): Promise<Discussion | null> {
    await connectToDatabase();
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const doc = await DiscussionModel.findById(id);
    return doc ? toEntity(doc) : null;
  }

  async findManyByIds(ids: string[]): Promise<Discussion[]> {
    if (ids.length === 0) return [];
    await connectToDatabase();
    const oids = ids
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));
    if (oids.length === 0) return [];
    const docs = await DiscussionModel.find({ _id: { $in: oids } });
    return docs.map(toEntity);
  }

  async findAllPaginated(page: number, pageSize: number): Promise<Discussion[]> {
    await connectToDatabase();
    const docs = await DiscussionModel.find({})
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize);
    return docs.map(toEntity);
  }

  async create(
    discussion: Omit<Discussion, "_id" | "createdAt" | "updatedAt" | "answers" | "answersCount">,
  ): Promise<Discussion> {
    await connectToDatabase();
    const doc = await DiscussionModel.create(discussion);
    return toEntity(doc);
  }

  async createMany(
    discussions: Omit<Discussion, "_id" | "createdAt" | "updatedAt" | "answers" | "answersCount">[],
  ): Promise<number> {
    if (discussions.length === 0) return 0;
    await connectToDatabase();
    const inserted = await DiscussionModel.insertMany(discussions, { ordered: false });
    return inserted.length;
  }

  async delete(id: string): Promise<void> {
    await connectToDatabase();
    await DiscussionModel.findByIdAndDelete(id);
  }

  async findAll(): Promise<Discussion[]> {
    await connectToDatabase();
    const docs = await DiscussionModel.find({});
    return docs.map(toEntity);
  }

  async anonymizeByUsername(oldUsername: string, replacement: string): Promise<number> {
    await connectToDatabase();
    // Answers are anonymized separately via DiscussionAnswerRepository
    // (Phase 9.3). This method only handles the top-level discussion author.
    const result = await DiscussionModel.updateMany(
      { username: oldUsername },
      { $set: { username: replacement } },
    );
    return result.modifiedCount ?? 0;
  }

  async userHasOpenedDiscussion(username: string): Promise<boolean> {
    await connectToDatabase();
    const doc = await DiscussionModel.findOne({ username }, { _id: 1 });
    return doc !== null;
  }
}
