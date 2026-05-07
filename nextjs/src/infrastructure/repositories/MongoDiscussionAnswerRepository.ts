import mongoose from "mongoose";
import { IDiscussionAnswerRepository } from "@/domain/repositories/IDiscussionAnswerRepository";
import { DiscussionAnswer } from "@/domain/entities/DiscussionAnswer";
import {
  DiscussionAnswerModel,
  IDiscussionAnswerDocument,
} from "@/infrastructure/database/models/DiscussionAnswerModel";
import { connectToDatabase } from "@/infrastructure/database/connection";

function toEntity(doc: IDiscussionAnswerDocument): DiscussionAnswer {
  return {
    _id: doc._id?.toString(),
    discussionId: doc.discussionId.toString(),
    userId: doc.userId,
    username: doc.username,
    text: doc.text,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function toObjectIds(ids: string[]): mongoose.Types.ObjectId[] {
  const out: mongoose.Types.ObjectId[] = [];
  for (const id of ids) {
    if (mongoose.Types.ObjectId.isValid(id)) {
      out.push(new mongoose.Types.ObjectId(id));
    }
  }
  return out;
}

export class MongoDiscussionAnswerRepository implements IDiscussionAnswerRepository {
  async add(input: {
    discussionId: string;
    userId: string;
    username: string;
    text: string;
  }): Promise<DiscussionAnswer> {
    if (!mongoose.Types.ObjectId.isValid(input.discussionId)) {
      throw new Error("Invalid discussionId");
    }
    await connectToDatabase();
    const doc = await DiscussionAnswerModel.create({
      discussionId: new mongoose.Types.ObjectId(input.discussionId),
      userId: input.userId,
      username: input.username,
      text: input.text,
    });
    return toEntity(doc);
  }

  async update(answerId: string, text: string): Promise<DiscussionAnswer | null> {
    if (!mongoose.Types.ObjectId.isValid(answerId)) return null;
    await connectToDatabase();
    const doc = await DiscussionAnswerModel.findByIdAndUpdate(
      answerId,
      { $set: { text } },
      { returnDocument: "after" },
    );
    return doc ? toEntity(doc) : null;
  }

  async findById(answerId: string): Promise<DiscussionAnswer | null> {
    if (!mongoose.Types.ObjectId.isValid(answerId)) return null;
    await connectToDatabase();
    const doc = await DiscussionAnswerModel.findById(answerId);
    return doc ? toEntity(doc) : null;
  }

  async findByDiscussion(discussionId: string): Promise<DiscussionAnswer[]> {
    if (!mongoose.Types.ObjectId.isValid(discussionId)) return [];
    await connectToDatabase();
    const docs = await DiscussionAnswerModel.find({
      discussionId: new mongoose.Types.ObjectId(discussionId),
    }).sort({ createdAt: 1 });
    return docs.map(toEntity);
  }

  async countByDiscussion(discussionIds: string[]): Promise<Map<string, number>> {
    const out = new Map<string, number>();
    if (discussionIds.length === 0) return out;
    await connectToDatabase();
    const oids = toObjectIds(discussionIds);
    if (oids.length === 0) return out;
    const rows = await DiscussionAnswerModel.aggregate<{
      _id: mongoose.Types.ObjectId;
      total: number;
    }>([
      { $match: { discussionId: { $in: oids } } },
      { $group: { _id: "$discussionId", total: { $sum: 1 } } },
    ]);
    for (const row of rows) out.set(row._id.toString(), row.total);
    return out;
  }

  async findByUser(userId: string): Promise<DiscussionAnswer[]> {
    await connectToDatabase();
    const docs = await DiscussionAnswerModel.find({ userId }).sort({ createdAt: 1 });
    return docs.map(toEntity);
  }

  async userHasAnsweredAny(userId: string): Promise<boolean> {
    await connectToDatabase();
    const doc = await DiscussionAnswerModel.findOne({ userId }, { _id: 1 });
    return doc !== null;
  }

  async anonymizeByUser(userId: string, replacement: string): Promise<number> {
    await connectToDatabase();
    const result = await DiscussionAnswerModel.updateMany(
      { userId },
      { $set: { username: replacement } },
    );
    return result.modifiedCount ?? 0;
  }

  async deleteByDiscussion(discussionId: string): Promise<number> {
    if (!mongoose.Types.ObjectId.isValid(discussionId)) return 0;
    await connectToDatabase();
    const res = await DiscussionAnswerModel.deleteMany({
      discussionId: new mongoose.Types.ObjectId(discussionId),
    });
    return res.deletedCount ?? 0;
  }
}
