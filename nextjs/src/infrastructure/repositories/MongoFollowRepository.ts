import { IFollowRepository } from "@/domain/repositories/IFollowRepository";
import { FollowModel } from "@/infrastructure/database/models/FollowModel";
import { connectToDatabase } from "@/infrastructure/database/connection";

export class MongoFollowRepository implements IFollowRepository {
  async follow(followerId: string, followingId: string): Promise<boolean> {
    await connectToDatabase();
    const result = await FollowModel.updateOne(
      { followerId, followingId },
      { $setOnInsert: { followerId, followingId } },
      { upsert: true },
    );
    return (result.upsertedCount ?? 0) > 0;
  }

  async unfollow(followerId: string, followingId: string): Promise<void> {
    await connectToDatabase();
    await FollowModel.deleteOne({ followerId, followingId });
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    await connectToDatabase();
    const doc = await FollowModel.exists({ followerId, followingId });
    return doc !== null;
  }

  async listFollowingIds(followerId: string): Promise<string[]> {
    await connectToDatabase();
    const docs = await FollowModel.find(
      { followerId },
      { followingId: 1, _id: 0 },
    )
      .sort({ createdAt: -1 })
      .lean();
    return docs.map((d) => d.followingId);
  }

  async listFollowerIds(userId: string): Promise<string[]> {
    await connectToDatabase();
    const docs = await FollowModel.find(
      { followingId: userId },
      { followerId: 1, _id: 0 },
    )
      .sort({ createdAt: -1 })
      .lean();
    return docs.map((d) => d.followerId);
  }

  async countFollowers(userId: string): Promise<number> {
    await connectToDatabase();
    return FollowModel.countDocuments({ followingId: userId });
  }

  async countFollowing(userId: string): Promise<number> {
    await connectToDatabase();
    return FollowModel.countDocuments({ followerId: userId });
  }
}
