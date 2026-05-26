import { IEmailVerificationTokenRepository } from "@/domain/repositories/IEmailVerificationTokenRepository";
import { EmailVerificationToken } from "@/domain/entities/EmailVerificationToken";
import {
  EmailVerificationTokenModel,
  IEmailVerificationTokenDocument,
} from "@/infrastructure/database/models/EmailVerificationTokenModel";
import { connectToDatabase } from "@/infrastructure/database/connection";

function toEntity(doc: IEmailVerificationTokenDocument): EmailVerificationToken {
  return {
    _id: doc._id?.toString(),
    userId: doc.userId,
    email: doc.email,
    tokenHash: doc.tokenHash,
    expiresAt: doc.expiresAt,
    createdAt: doc.createdAt,
  };
}

export class MongoEmailVerificationTokenRepository implements IEmailVerificationTokenRepository {
  async create(
    token: Omit<EmailVerificationToken, "_id" | "createdAt">,
  ): Promise<EmailVerificationToken> {
    await connectToDatabase();
    const doc = await EmailVerificationTokenModel.create(token);
    return toEntity(doc);
  }

  async findActiveByHash(hash: string): Promise<EmailVerificationToken | null> {
    await connectToDatabase();
    const doc = await EmailVerificationTokenModel.findOne({
      tokenHash: hash,
      expiresAt: { $gt: new Date() },
    });
    return doc ? toEntity(doc) : null;
  }

  async deleteByUserId(userId: string): Promise<void> {
    await connectToDatabase();
    await EmailVerificationTokenModel.deleteMany({ userId });
  }

  async deleteById(id: string): Promise<void> {
    await connectToDatabase();
    await EmailVerificationTokenModel.deleteOne({ _id: id });
  }

  async countRecentByUserId(userId: string, sinceMs: number): Promise<number> {
    await connectToDatabase();
    const since = new Date(Date.now() - sinceMs);
    return EmailVerificationTokenModel.countDocuments({
      userId,
      createdAt: { $gte: since },
    });
  }
}
