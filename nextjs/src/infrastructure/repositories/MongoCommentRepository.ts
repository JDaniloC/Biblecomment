import { ICommentRepository } from "@/domain/repositories/ICommentRepository";
import { Comment } from "@/domain/entities/Comment";
import { CommentModel, ICommentDocument } from "@/infrastructure/database/models/CommentModel";
import { connectToDatabase } from "@/infrastructure/database/connection";
import mongoose from "mongoose";

function toEntity(doc: ICommentDocument): Comment {
  return {
    _id: doc._id?.toString(),
    verseId: doc.verseId?.toString() ?? "",
    username: doc.username,
    onTitle: doc.onTitle,
    bookReference: doc.bookReference,
    text: doc.text,
    tags: doc.tags,
    verified: doc.verified ?? false,
    verifiedBy: doc.verifiedBy,
    verifiedAt: doc.verifiedAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export class MongoCommentRepository implements ICommentRepository {
  async findByVerseId(verseId: string): Promise<Comment[]> {
    await connectToDatabase();
    if (!mongoose.Types.ObjectId.isValid(verseId)) return [];
    const docs = await CommentModel.find({ verseId: new mongoose.Types.ObjectId(verseId) }).sort({ createdAt: -1 });
    return docs.map(toEntity);
  }

  async findByUsername(username: string): Promise<Comment[]> {
    await connectToDatabase();
    const docs = await CommentModel.find({ username }).sort({ createdAt: -1 });
    return docs.map(toEntity);
  }

  async findById(id: string): Promise<Comment | null> {
    await connectToDatabase();
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const doc = await CommentModel.findById(id);
    return doc ? toEntity(doc) : null;
  }

  async findAllPaginated(page: number, pageSize: number): Promise<Comment[]> {
    await connectToDatabase();
    const docs = await CommentModel.find({})
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize);
    return docs.map(toEntity);
  }

  async findManyByIds(ids: string[]): Promise<Comment[]> {
    if (ids.length === 0) return [];
    await connectToDatabase();
    const oids = ids
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));
    if (oids.length === 0) return [];
    const docs = await CommentModel.find({ _id: { $in: oids } });
    return docs.map(toEntity);
  }

  async create(comment: Omit<Comment, "_id" | "createdAt" | "updatedAt">): Promise<Comment> {
    await connectToDatabase();
    const doc = await CommentModel.create({
      ...comment,
      verseId: new mongoose.Types.ObjectId(comment.verseId),
    });
    return toEntity(doc);
  }

  async createMany(comments: Omit<Comment, "_id" | "createdAt" | "updatedAt">[]): Promise<number> {
    if (comments.length === 0) return 0;
    await connectToDatabase();
    const docs = comments
      .filter((c) => mongoose.Types.ObjectId.isValid(c.verseId))
      .map((c) => ({ ...c, verseId: new mongoose.Types.ObjectId(c.verseId) }));
    if (docs.length === 0) return 0;
    const inserted = await CommentModel.insertMany(docs, { ordered: false });
    return inserted.length;
  }

  async update(id: string, data: Partial<Comment>): Promise<Comment | null> {
    await connectToDatabase();
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const doc = await CommentModel.findByIdAndUpdate(id, { $set: data }, { returnDocument: "after" });
    return doc ? toEntity(doc) : null;
  }

  async delete(id: string): Promise<void> {
    await connectToDatabase();
    await CommentModel.findByIdAndDelete(id);
  }

  async findAll(): Promise<Comment[]> {
    await connectToDatabase();
    const docs = await CommentModel.find({});
    return docs.map(toEntity);
  }

  async searchByText(query: string): Promise<Comment[]> {
    await connectToDatabase();
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const docs = await CommentModel.find(
      { text: { $regex: escaped, $options: "i" } },
      { _id: 1, text: 1, username: 1, bookReference: 1, createdAt: 1, verseId: 1 }
    ).sort({ createdAt: -1 }).limit(100);
    return docs.map(toEntity);
  }

  async anonymizeByUsername(oldUsername: string, replacement: string): Promise<number> {
    await connectToDatabase();
    const result = await CommentModel.updateMany(
      { username: oldUsername },
      { $set: { username: replacement } },
    );
    return result.modifiedCount ?? 0;
  }

  async findForModeration(opts: {
    q?: string;
    page: number;
    pageSize: number;
  }): Promise<{ items: Comment[]; total: number }> {
    await connectToDatabase();
    const filter: Record<string, unknown> = {};
    const q = opts.q?.trim();
    if (q) {
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(escaped, "i");
      filter.$or = [{ text: re }, { username: re }, { bookReference: re }];
    }
    const skip = Math.max(0, (opts.page - 1) * opts.pageSize);
    const [docs, total] = await Promise.all([
      CommentModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(opts.pageSize),
      CommentModel.countDocuments(filter),
    ]);
    return { items: docs.map(toEntity), total };
  }

  async setVerified(id: string, verified: boolean, by: string | null): Promise<Comment | null> {
    await connectToDatabase();
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const update = verified
      ? { $set: { verified: true, verifiedBy: by ?? "", verifiedAt: new Date() } }
      : { $set: { verified: false }, $unset: { verifiedBy: "", verifiedAt: "" } };
    const doc = await CommentModel.findByIdAndUpdate(id, update, { returnDocument: "after" });
    return doc ? toEntity(doc) : null;
  }

  async findDailyFeatured(dayIndex: number): Promise<Comment | null> {
    await connectToDatabase();
    const filter = { onTitle: false, $expr: { $gte: [{ $strLenCP: "$text" }, 40] } };
    const total = await CommentModel.countDocuments(filter);
    if (total === 0) return null;
    const skip = dayIndex % total;
    const doc = await CommentModel.findOne(filter).sort({ _id: 1 }).skip(skip);
    return doc ? toEntity(doc) : null;
  }
}
