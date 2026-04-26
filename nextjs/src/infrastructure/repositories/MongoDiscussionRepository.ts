import { IDiscussionRepository } from "@/domain/repositories/IDiscussionRepository";
import { Discussion, DiscussionAnswer } from "@/domain/entities/Discussion";
import { DiscussionModel, IDiscussionDocument } from "@/infrastructure/database/models/DiscussionModel";
import { connectToDatabase } from "@/infrastructure/database/connection";
import mongoose from "mongoose";

function toEntity(doc: IDiscussionDocument): Discussion {
  return {
    _id: doc._id.toString(),
    bookAbbrev: doc.bookAbbrev,
    commentId: doc.commentId?.toString(),
    username: doc.username,
    verseReference: doc.verseReference,
    verseText: doc.verseText,
    commentText: doc.commentText,
    question: doc.question,
    answers: doc.answers,
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

  async findById(id: string): Promise<Discussion | null> {
    await connectToDatabase();
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const doc = await DiscussionModel.findById(id);
    return doc ? toEntity(doc) : null;
  }

  async findAllPaginated(page: number, pageSize: number): Promise<Discussion[]> {
    await connectToDatabase();
    const docs = await DiscussionModel.find({})
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize);
    return docs.map(toEntity);
  }

  async create(discussion: Omit<Discussion, "_id" | "createdAt" | "updatedAt">): Promise<Discussion> {
    await connectToDatabase();
    const doc = await DiscussionModel.create(discussion);
    return toEntity(doc);
  }

  async createMany(discussions: Omit<Discussion, "_id" | "createdAt" | "updatedAt">[]): Promise<number> {
    if (discussions.length === 0) return 0;
    await connectToDatabase();
    const inserted = await DiscussionModel.insertMany(discussions, { ordered: false });
    return inserted.length;
  }

  async addAnswer(id: string, answer: DiscussionAnswer): Promise<Discussion | null> {
    await connectToDatabase();
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const doc = await DiscussionModel.findByIdAndUpdate(
      id,
      { $push: { answers: answer } },
      { new: true }
    );
    return doc ? toEntity(doc) : null;
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
}
