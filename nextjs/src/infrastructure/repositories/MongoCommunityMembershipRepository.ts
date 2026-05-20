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

	async findOne(
		userId: string,
		communityId: string,
	): Promise<CommunityMembership | null> {
		await connectToDatabase();
		const doc = await CommunityMembershipModel.findOne({ userId, communityId });
		return doc ? toEntity(doc) : null;
	}

	async countApproved(communityId: string): Promise<number> {
		await connectToDatabase();
		// Match toEntity()'s legacy convention: rows without `status` are
		// treated as approved (pre-migration data). The migration script
		// backfills these but the query stays defensive so reads can't be
		// off-by-N when a fresh DB hasn't been migrated yet.
		return CommunityMembershipModel.countDocuments({
			communityId,
			$or: [{ status: "approved" }, { status: { $exists: false } }],
		});
	}

	async approvedUserIds(communityId: string): Promise<string[]> {
		await connectToDatabase();
		// See `countApproved` — same defensive predicate so callers like
		// `ListCommunityCommentsUseCase` and the comment prioritization
		// path don't drop legacy-data members on the floor.
		const docs = await CommunityMembershipModel.find(
			{
				communityId,
				$or: [{ status: "approved" }, { status: { $exists: false } }],
			},
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

	// Interface contract — `this` is unused but the method has to live on
	// the class. DeepSource JS-0105 is a false positive here.
	// skipcq: JS-0105
	async removeAllByCommunity(communityId: string): Promise<number> {
		await connectToDatabase();
		const result = await CommunityMembershipModel.deleteMany({ communityId });
		return result.deletedCount ?? 0;
	}
}
