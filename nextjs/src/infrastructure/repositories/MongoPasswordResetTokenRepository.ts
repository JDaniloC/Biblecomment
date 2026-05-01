import { IPasswordResetTokenRepository } from "@/domain/repositories/IPasswordResetTokenRepository";
import { PasswordResetToken } from "@/domain/entities/PasswordResetToken";
import {
  PasswordResetTokenModel,
  IPasswordResetTokenDocument,
} from "@/infrastructure/database/models/PasswordResetTokenModel";
import { connectToDatabase } from "@/infrastructure/database/connection";

function toEntity(doc: IPasswordResetTokenDocument): PasswordResetToken {
  return {
    _id: doc._id?.toString(),
    userId: doc.userId,
    tokenHash: doc.tokenHash,
    expiresAt: doc.expiresAt,
    createdAt: doc.createdAt,
  };
}

export class MongoPasswordResetTokenRepository implements IPasswordResetTokenRepository {
  async create(
    token: Omit<PasswordResetToken, "_id" | "createdAt">,
  ): Promise<PasswordResetToken> {
    await connectToDatabase();
    const doc = await PasswordResetTokenModel.create(token);
    return toEntity(doc);
  }

  async findActiveByHash(hash: string): Promise<PasswordResetToken | null> {
    await connectToDatabase();
    const doc = await PasswordResetTokenModel.findOne({
      tokenHash: hash,
      expiresAt: { $gt: new Date() },
    });
    return doc ? toEntity(doc) : null;
  }

  async deleteByUserId(userId: string): Promise<void> {
    await connectToDatabase();
    await PasswordResetTokenModel.deleteMany({ userId });
  }

  async deleteById(id: string): Promise<void> {
    await connectToDatabase();
    await PasswordResetTokenModel.deleteOne({ _id: id });
  }

  async countRecentByUserId(userId: string, sinceMs: number): Promise<number> {
    await connectToDatabase();
    const since = new Date(Date.now() - sinceMs);
    return PasswordResetTokenModel.countDocuments({
      userId,
      createdAt: { $gte: since },
    });
  }
}
