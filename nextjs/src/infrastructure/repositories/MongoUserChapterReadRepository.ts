import { IUserChapterReadRepository } from "@/domain/repositories/IUserChapterReadRepository";
import { UserChapterRead } from "@/domain/entities/UserChapterRead";
import {
  UserChapterReadModel,
  IUserChapterReadDocument,
} from "@/infrastructure/database/models/UserChapterReadModel";
import { connectToDatabase } from "@/infrastructure/database/connection";

function toEntity(doc: IUserChapterReadDocument): UserChapterRead {
  return {
    _id: doc._id?.toString(),
    userId: doc.userId,
    abbrev: doc.abbrev,
    chapter: doc.chapter,
    readAt: doc.readAt,
  };
}

export class MongoUserChapterReadRepository implements IUserChapterReadRepository {
  async markRead(userId: string, abbrev: string, chapter: number): Promise<boolean> {
    await connectToDatabase();
    const result = await UserChapterReadModel.updateOne(
      { userId, abbrev: abbrev.toLowerCase(), chapter },
      { $setOnInsert: { readAt: new Date() } },
      { upsert: true },
    );
    return result.upsertedCount > 0;
  }

  async unmarkRead(userId: string, abbrev: string, chapter: number): Promise<void> {
    await connectToDatabase();
    await UserChapterReadModel.deleteOne({
      userId,
      abbrev: abbrev.toLowerCase(),
      chapter,
    });
  }

  async countByUser(userId: string): Promise<number> {
    await connectToDatabase();
    return UserChapterReadModel.countDocuments({ userId });
  }

  async findChaptersForBook(userId: string, abbrev: string): Promise<number[]> {
    await connectToDatabase();
    const docs = await UserChapterReadModel.find(
      { userId, abbrev: abbrev.toLowerCase() },
      { chapter: 1, _id: 0 },
    ).sort({ chapter: 1 });
    return docs.map((d) => d.chapter);
  }

  async countByUserPerBook(userId: string): Promise<Record<string, number>> {
    await connectToDatabase();
    const rows = await UserChapterReadModel.aggregate<{ _id: string; total: number }>([
      { $match: { userId } },
      { $group: { _id: "$abbrev", total: { $sum: 1 } } },
    ]);
    const out: Record<string, number> = {};
    for (const row of rows) out[row._id] = row.total;
    return out;
  }

  async findAllForUser(userId: string): Promise<UserChapterRead[]> {
    await connectToDatabase();
    const docs = await UserChapterReadModel.find({ userId });
    return docs.map(toEntity);
  }
}
