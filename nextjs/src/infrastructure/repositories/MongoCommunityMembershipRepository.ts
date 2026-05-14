import { ICommunityMembershipRepository } from "@/domain/repositories/ICommunityMembershipRepository";
import { CommunityMembership } from "@/domain/entities/CommunityMembership";
import {
  CommunityMembershipModel,
  ICommunityMembershipDocument,
} from "@/infrastructure/database/models/CommunityMembershipModel";
import { connectToDatabase } from "@/infrastructure/database/connection";

function toEntity(doc: ICommunityMembershipDocument): CommunityMembership {
  return {
    _id: doc._id?.toString(),
    userId: doc.userId,
    communityId: doc.communityId,
    joinedAt: doc.joinedAt,
  };
}

export class MongoCommunityMembershipRepository
  implements ICommunityMembershipRepository
{
  async join(userId: string, communityId: string): Promise<boolean> {
    await connectToDatabase();
    const result = await CommunityMembershipModel.updateOne(
      { userId, communityId },
      { $setOnInsert: { userId, communityId } },
      { upsert: true },
    );
    return (result.upsertedCount ?? 0) > 0;
  }

  async leave(userId: string, communityId: string): Promise<boolean> {
    await connectToDatabase();
    const result = await CommunityMembershipModel.deleteOne({ userId, communityId });
    return (result.deletedCount ?? 0) > 0;
  }

  async isMember(userId: string, communityId: string): Promise<boolean> {
    await connectToDatabase();
    const doc = await CommunityMembershipModel.exists({ userId, communityId });
    return doc !== null;
  }

  async listCommunityIdsForUser(userId: string): Promise<string[]> {
    await connectToDatabase();
    const docs = await CommunityMembershipModel.find(
      { userId },
      { communityId: 1, _id: 0 },
    )
      .sort({ joinedAt: -1 })
      .lean();
    return docs.map((d) => d.communityId);
  }

  async listMemberIds(
    communityId: string,
    page: number,
    pageSize: number,
  ): Promise<{ items: string[]; total: number }> {
    await connectToDatabase();
    const p = Math.max(1, page);
    const size = Math.max(1, Math.min(pageSize, 100));
    const [docs, total] = await Promise.all([
      CommunityMembershipModel.find(
        { communityId },
        { userId: 1, _id: 0 },
      )
        .sort({ joinedAt: -1 })
        .skip((p - 1) * size)
        .limit(size)
        .lean(),
      CommunityMembershipModel.countDocuments({ communityId }),
    ]);
    return { items: docs.map((d) => d.userId), total };
  }

  async listForUser(userId: string): Promise<CommunityMembership[]> {
    await connectToDatabase();
    const docs = await CommunityMembershipModel.find({ userId }).sort({
      joinedAt: -1,
    });
    return docs.map(toEntity);
  }
}
