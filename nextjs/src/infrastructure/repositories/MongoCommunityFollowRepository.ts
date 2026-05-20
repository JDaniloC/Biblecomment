import { ICommunityFollowRepository } from "@/domain/repositories/ICommunityFollowRepository";
import { CommunityFollow } from "@/domain/entities/CommunityFollow";
import {
	CommunityFollowModel,
	ICommunityFollowDocument,
} from "@/infrastructure/database/models/CommunityFollowModel";
import { connectToDatabase } from "@/infrastructure/database/connection";

function toEntity(doc: ICommunityFollowDocument): CommunityFollow {
	return {
		_id: doc._id?.toString(),
		userId: doc.userId,
		communityId: doc.communityId,
		followedAt: doc.followedAt,
	};
}

export class MongoCommunityFollowRepository implements ICommunityFollowRepository {
	async follow(userId: string, communityId: string): Promise<boolean> {
		await connectToDatabase();
		const result = await CommunityFollowModel.updateOne(
			{ userId, communityId },
			{ $setOnInsert: { userId, communityId } },
			{ upsert: true },
		);
		return (result.upsertedCount ?? 0) > 0;
	}

	async unfollow(userId: string, communityId: string): Promise<boolean> {
		await connectToDatabase();
		const result = await CommunityFollowModel.deleteOne({
			userId,
			communityId,
		});
		return (result.deletedCount ?? 0) > 0;
	}

	async isFollowing(userId: string, communityId: string): Promise<boolean> {
		await connectToDatabase();
		return (
			(await CommunityFollowModel.exists({ userId, communityId })) !== null
		);
	}

	async followedCommunityIds(userId: string): Promise<string[]> {
		await connectToDatabase();
		const docs = await CommunityFollowModel.find(
			{ userId },
			{ communityId: 1, _id: 0 },
		)
			.sort({ followedAt: -1 })
			.lean();
		return docs.map((d) => d.communityId);
	}

	async listForUser(userId: string): Promise<CommunityFollow[]> {
		await connectToDatabase();
		const docs = await CommunityFollowModel.find({ userId }).sort({
			followedAt: -1,
		});
		return docs.map(toEntity);
	}

	async countByCommunity(communityId: string): Promise<number> {
		await connectToDatabase();
		return CommunityFollowModel.countDocuments({ communityId });
	}

	async removeAllByUser(userId: string): Promise<number> {
		await connectToDatabase();
		const r = await CommunityFollowModel.deleteMany({ userId });
		return r.deletedCount ?? 0;
	}

	async removeAllByCommunity(communityId: string): Promise<number> {
		await connectToDatabase();
		const r = await CommunityFollowModel.deleteMany({ communityId });
		return r.deletedCount ?? 0;
	}
}
