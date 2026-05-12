import mongoose from "mongoose";
import { ICommentLikeRepository } from "@/domain/repositories/ICommentLikeRepository";
import { CommentLikeModel } from "@/infrastructure/database/models/CommentLikeModel";
import { connectToDatabase } from "@/infrastructure/database/connection";

function toObjectIds(ids: string[]): mongoose.Types.ObjectId[] {
  const out: mongoose.Types.ObjectId[] = [];
  for (const id of ids) {
    if (mongoose.Types.ObjectId.isValid(id)) {
      out.push(new mongoose.Types.ObjectId(id));
    }
  }
  return out;
}

export class MongoCommentLikeRepository implements ICommentLikeRepository {
  async like(userId: string, commentId: string): Promise<boolean> {
    if (!mongoose.Types.ObjectId.isValid(commentId)) return false;
    await connectToDatabase();
    const result = await CommentLikeModel.updateOne(
      { userId, commentId: new mongoose.Types.ObjectId(commentId) },
      { $setOnInsert: { createdAt: new Date() } },
      { upsert: true },
    );
    return (result.upsertedCount ?? 0) > 0;
  }

  async unlike(userId: string, commentId: string): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(commentId)) return;
    await connectToDatabase();
    await CommentLikeModel.deleteOne({
      userId,
      commentId: new mongoose.Types.ObjectId(commentId),
    });
  }

  async hasLiked(userId: string, commentId: string): Promise<boolean> {
    if (!mongoose.Types.ObjectId.isValid(commentId)) return false;
    await connectToDatabase();
    const doc = await CommentLikeModel.findOne(
      { userId, commentId: new mongoose.Types.ObjectId(commentId) },
      { _id: 1 },
    );
    return doc !== null;
  }

  async countByComment(commentIds: string[]): Promise<Map<string, number>> {
    const out = new Map<string, number>();
    if (commentIds.length === 0) return out;
    await connectToDatabase();
    const oids = toObjectIds(commentIds);
    if (oids.length === 0) return out;
    const rows = await CommentLikeModel.aggregate<{ _id: mongoose.Types.ObjectId; total: number }>([
      { $match: { commentId: { $in: oids } } },
      { $group: { _id: "$commentId", total: { $sum: 1 } } },
    ]);
    for (const row of rows) out.set(row._id.toString(), row.total);
    return out;
  }

  async whichLiked(userId: string, commentIds: string[]): Promise<Set<string>> {
    const out = new Set<string>();
    if (commentIds.length === 0) return out;
    await connectToDatabase();
    const oids = toObjectIds(commentIds);
    if (oids.length === 0) return out;
    const docs = await CommentLikeModel.find(
      { userId, commentId: { $in: oids } },
      { commentId: 1, _id: 0 },
    );
    for (const d of docs) out.add(d.commentId.toString());
    return out;
  }

  async findCommentIdsLikedBy(userId: string, page: number, pageSize: number): Promise<string[]> {
    await connectToDatabase();
    const docs = await CommentLikeModel.find({ userId }, { commentId: 1, _id: 0 })
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize);
    return docs.map((d) => d.commentId.toString());
  }

  async userHasGivenAnyLike(userId: string): Promise<boolean> {
    await connectToDatabase();
    const doc = await CommentLikeModel.findOne({ userId }, { _id: 1 });
    return doc !== null;
  }

  async topLikedSince(
    since: Date,
    limit: number,
  ): Promise<Array<{ commentId: string; likeCount: number }>> {
    await connectToDatabase();
    const rows = await CommentLikeModel.aggregate<{
      _id: mongoose.Types.ObjectId;
      total: number;
    }>([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: "$commentId", total: { $sum: 1 } } },
      { $sort: { total: -1, _id: -1 } },
      { $limit: Math.max(1, Math.min(limit, 100)) },
    ]);
    return rows.map((r) => ({ commentId: r._id.toString(), likeCount: r.total }));
  }

  async deleteAllByUser(userId: string): Promise<number> {
    await connectToDatabase();
    const res = await CommentLikeModel.deleteMany({ userId });
    return res.deletedCount ?? 0;
  }

  async deleteAllByComment(commentId: string): Promise<number> {
    if (!mongoose.Types.ObjectId.isValid(commentId)) return 0;
    await connectToDatabase();
    const res = await CommentLikeModel.deleteMany({
      commentId: new mongoose.Types.ObjectId(commentId),
    });
    return res.deletedCount ?? 0;
  }
}
