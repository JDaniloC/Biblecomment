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
		status: doc.status ?? "approved",
		role: doc.role ?? "member",
		joinedAt: doc.joinedAt,
	};
}

export class MongoCommunityMembershipRepository implements ICommunityMembershipRepository {
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
		const result = await CommunityMembershipModel.deleteOne({
			userId,
			communityId,
		});
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
			CommunityMembershipModel.find({ communityId }, { userId: 1, _id: 0 })
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

	// ── Moderation / prioritization (plan_community) ──

	async createRequest(userId: string, communityId: string): Promise<void> {
		await connectToDatabase();
		await CommunityMembershipModel.updateOne(
			{ userId, communityId },
			{
				$setOnInsert: {
					userId,
					communityId,
					status: "pending",
					role: "member",
				},
			},
			{ upsert: true },
		);
	}

	async listByStatus(
		communityId: string,
		status: "pending" | "approved",
	): Promise<CommunityMembership[]> {
		await connectToDatabase();
		const docs = await CommunityMembershipModel.find({
			communityId,
			status,
		}).sort({ joinedAt: 1 });
		return docs.map(toEntity);
	}

	async setStatus(
		userId: string,
		communityId: string,
		status: "pending" | "approved",
	): Promise<boolean> {
		await connectToDatabase();
		const r = await CommunityMembershipModel.updateOne(
			{ userId, communityId },
			{ $set: { status } },
		);
		return (r.modifiedCount ?? 0) > 0;
	}

	async remove(userId: string, communityId: string): Promise<boolean> {
		await connectToDatabase();
		const r = await CommunityMembershipModel.deleteOne({ userId, communityId });
		return (r.deletedCount ?? 0) > 0;
	}

	async getStatus(
		userId: string,
		communityId: string,
	): Promise<"pending" | "approved" | null> {
		await connectToDatabase();
		const doc = await CommunityMembershipModel.findOne(
			{ userId, communityId },
			{ status: 1, _id: 0 },
		).lean();
		return (doc?.status as "pending" | "approved" | undefined) ?? null;
	}

	async countApproved(communityId: string): Promise<number> {
		await connectToDatabase();
		return CommunityMembershipModel.countDocuments({
			communityId,
			status: "approved",
		});
	}

	async approvedUserIds(communityId: string): Promise<string[]> {
		await connectToDatabase();
		const docs = await CommunityMembershipModel.find(
			{ communityId, status: "approved" },
			{ userId: 1, _id: 0 },
		).lean();
		return docs.map((d) => d.userId);
	}

	async setRole(
		userId: string,
		communityId: string,
		role: "member" | "moderator",
	): Promise<boolean> {
		await connectToDatabase();
		const r = await CommunityMembershipModel.updateOne(
			{ userId, communityId },
			{ $set: { role } },
		);
		return (r.modifiedCount ?? 0) > 0;
	}

	async isModerator(userId: string, communityId: string): Promise<boolean> {
		await connectToDatabase();
		const doc = await CommunityMembershipModel.exists({
			userId,
			communityId,
			role: "moderator",
			status: "approved",
		});
		return doc !== null;
	}
}
