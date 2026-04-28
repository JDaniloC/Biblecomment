import { IDiscussionRepository } from "@/domain/repositories/IDiscussionRepository";
import { Discussion, DiscussionAnswer } from "@/domain/entities/Discussion";
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
    answers: doc.answers.map((a) => ({
      _id: a._id?.toString(),
      name: a.name,
      text: a.text,
    })),
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
    const doc = await DiscussionModel.create({
      ...discussion,
      // Domain's DiscussionAnswer has _id: string. On insert we let
      // Mongo assign fresh ObjectIds — strip any incoming _id rather
      // than fight the type.
      answers: discussion.answers.map(({ _id: _omit, ...rest }) => rest),
    });
    return toEntity(doc);
  }

  async createMany(discussions: Omit<Discussion, "_id" | "createdAt" | "updatedAt">[]): Promise<number> {
    if (discussions.length === 0) return 0;
    await connectToDatabase();
    const sanitized = discussions.map((d) => ({
      ...d,
      answers: d.answers.map(({ _id: _omit, ...rest }) => rest),
    }));
    const inserted = await DiscussionModel.insertMany(sanitized, { ordered: false });
    return inserted.length;
  }

  async addAnswer(id: string, answer: DiscussionAnswer): Promise<Discussion | null> {
    await connectToDatabase();
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const { _id: _omit, ...answerData } = answer;
    const doc = await DiscussionModel.findByIdAndUpdate(
      id,
      { $push: { answers: answerData } },
      { returnDocument: "after" }
    );
    return doc ? toEntity(doc) : null;
  }

  async updateAnswer(
    discussionId: string,
    answerId: string,
    text: string,
  ): Promise<Discussion | null> {
    await connectToDatabase();
    if (
      !mongoose.Types.ObjectId.isValid(discussionId) ||
      !mongoose.Types.ObjectId.isValid(answerId)
    ) {
      return null;
    }
    // arrayFilters lets Mongo update the matching subdocument by its _id
    // without reading-modifying-writing the whole answers array.
    const doc = await DiscussionModel.findByIdAndUpdate(
      discussionId,
      { $set: { "answers.$[ans].text": text } },
      {
        arrayFilters: [{ "ans._id": new mongoose.Types.ObjectId(answerId) }],
        returnDocument: "after",
      },
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

  async anonymizeByUsername(oldUsername: string, replacement: string): Promise<number> {
    await connectToDatabase();
    const [topLevel, embedded] = await Promise.all([
      DiscussionModel.updateMany(
        { username: oldUsername },
        { $set: { username: replacement } },
      ),
      DiscussionModel.updateMany(
        { "answers.name": oldUsername },
        { $set: { "answers.$[ans].name": replacement } },
        { arrayFilters: [{ "ans.name": oldUsername }] },
      ),
    ]);
    return (topLevel.modifiedCount ?? 0) + (embedded.modifiedCount ?? 0);
  }
}
