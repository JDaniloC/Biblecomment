import mongoose from "mongoose";
import {
  ICommentReportRepository,
  ReportedCommentAggregate,
} from "@/domain/repositories/ICommentReportRepository";
import { CommentReportModel } from "@/infrastructure/database/models/CommentReportModel";
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

export class MongoCommentReportRepository implements ICommentReportRepository {
  async report(userId: string, username: string, commentId: string): Promise<boolean> {
    if (!mongoose.Types.ObjectId.isValid(commentId)) return false;
    await connectToDatabase();
    const result = await CommentReportModel.updateOne(
      { userId, commentId: new mongoose.Types.ObjectId(commentId) },
      { $setOnInsert: { username, createdAt: new Date() } },
      { upsert: true },
    );
    return (result.upsertedCount ?? 0) > 0;
  }

  async clearReportsForComment(commentId: string): Promise<number> {
    if (!mongoose.Types.ObjectId.isValid(commentId)) return 0;
    await connectToDatabase();
    const res = await CommentReportModel.deleteMany({
      commentId: new mongoose.Types.ObjectId(commentId),
    });
    return res.deletedCount ?? 0;
  }

  async findReportedCommentIds(
    page: number,
    pageSize: number,
  ): Promise<ReportedCommentAggregate[]> {
    await connectToDatabase();
    const skip = Math.max(0, (page - 1) * pageSize);
    const rows = await CommentReportModel.aggregate<{
      _id: mongoose.Types.ObjectId;
      reportCount: number;
      reporters: string[];
    }>([
      {
        $group: {
          _id: "$commentId",
          reportCount: { $sum: 1 },
          reporters: { $addToSet: "$username" },
        },
      },
      // Most-reported first; ties break by oldest commentId for determinism.
      { $sort: { reportCount: -1, _id: 1 } },
      { $skip: skip },
      { $limit: pageSize },
    ]);
    return rows.map((r) => ({
      commentId: r._id.toString(),
      reportCount: r.reportCount,
      reporters: r.reporters,
    }));
  }

  async countByComment(commentIds: string[]): Promise<Map<string, number>> {
    const out = new Map<string, number>();
    if (commentIds.length === 0) return out;
    await connectToDatabase();
    const oids = toObjectIds(commentIds);
    if (oids.length === 0) return out;
    const rows = await CommentReportModel.aggregate<{
      _id: mongoose.Types.ObjectId;
      total: number;
    }>([
      { $match: { commentId: { $in: oids } } },
      { $group: { _id: "$commentId", total: { $sum: 1 } } },
    ]);
    for (const row of rows) out.set(row._id.toString(), row.total);
    return out;
  }

  async whichReported(userId: string, commentIds: string[]): Promise<Set<string>> {
    const out = new Set<string>();
    if (commentIds.length === 0) return out;
    await connectToDatabase();
    const oids = toObjectIds(commentIds);
    if (oids.length === 0) return out;
    const docs = await CommentReportModel.find(
      { userId, commentId: { $in: oids } },
      { commentId: 1, _id: 0 },
    );
    for (const d of docs) out.add(d.commentId.toString());
    return out;
  }

  async deleteAllByUser(userId: string): Promise<number> {
    await connectToDatabase();
    const res = await CommentReportModel.deleteMany({ userId });
    return res.deletedCount ?? 0;
  }

  async deleteAllByComment(commentId: string): Promise<number> {
    if (!mongoose.Types.ObjectId.isValid(commentId)) return 0;
    await connectToDatabase();
    const res = await CommentReportModel.deleteMany({
      commentId: new mongoose.Types.ObjectId(commentId),
    });
    return res.deletedCount ?? 0;
  }
}
