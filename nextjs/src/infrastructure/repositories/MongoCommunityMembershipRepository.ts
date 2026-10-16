import { ICommunityMembershipRepository } from "@/domain/repositories/ICommunityMembershipRepository";
import { CommunityMembership } from "@/domain/entities/CommunityMembership";
import {
	CommunityMembershipModel,
	ICommunityMembershipDocument,
} from "@/infrastructure/database/models/CommunityMembershipModel";
import { connectToDatabase } from "@/infrastructure/database/connection";
import type { QueryFilter } from "mongoose";

// Approved members, including legacy rows written before `status` existed
// (toEntity maps those to "approved" too). Every counter/visibility query
// should use this rather than `{ status: "approved" }`.
const APPROVED: QueryFilter<ICommunityMembershipDocument> = {
	$or: [{ status: "approved" }, { status: { $exists: false } }],
};

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

	async seedCreator(userId: string, communityId: string): Promise<void> {
		await connectToDatabase();
		await CommunityMembershipModel.updateOne(
			{ userId, communityId },
			{
				$set: { status: "approved", role: "moderator" },
				$setOnInsert: { userId, communityId },
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

	async removeReturningStatus(
		userId: string,
		communityId: string,
	): Promise<"pending" | "approved" | null> {
		await connectToDatabase();
		// lean(): a hydrated doc gets the schema default ("pending") for a
		// legacy row that has no status, hiding that it counted as approved.
		const doc = await CommunityMembershipModel.findOneAndDelete({
			userId,
			communityId,
		}).lean();
		if (!doc) return null;
		return (doc.status as "pending" | "approved" | undefined) ?? "approved";
	}

	async removePending(userId: string, communityId: string): Promise<boolean> {
		await connectToDatabase();
		const r = await CommunityMembershipModel.deleteOne({
			userId,
			communityId,
			status: "pending",
		});
		return (r.deletedCount ?? 0) > 0;
	}

	async removeAllByUser(userId: string): Promise<number> {
		await connectToDatabase();
		const r = await CommunityMembershipModel.deleteMany({ userId });
		return r.deletedCount ?? 0;
	}

	async listApprovedOrdered(communityId: string): Promise<CommunityMembership[]> {
		await connectToDatabase();
		const docs = await CommunityMembershipModel.find({
			communityId,
			...APPROVED,
		}).sort({ joinedAt: 1, _id: 1 });
		const rows = docs.map(toEntity);
		// Stable partition: moderators keep their seniority order ahead of members.
		return [
			...rows.filter((m) => m.role === "moderator"),
			...rows.filter((m) => m.role !== "moderator"),
		];
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
		if (!doc) return null;
		// Legacy rows predate `status` and count as approved everywhere else.
		return (doc.status as "pending" | "approved" | undefined) ?? "approved";
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
			...APPROVED,
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
				...APPROVED,
			},
			{ userId: 1, _id: 0 },
		).lean();
		return docs.map((d) => d.userId);
	}

	/**
	 * `approvedUserIds` for many communities in one query, keyed by
	 * communityId; communities without approved members are absent. Feeds
	 * the sitemap, so it lives here rather than on the interface.
	 */
	async approvedUserIdsByCommunity(
		communityIds: string[],
	): Promise<Record<string, string[]>> {
		if (communityIds.length === 0) return {};
		await connectToDatabase();
		const docs = await CommunityMembershipModel.find(
			{
				communityId: { $in: communityIds },
				...APPROVED,
			},
			{ userId: 1, communityId: 1, _id: 0 },
		).lean();
		const byCommunity: Record<string, string[]> = {};
		for (const d of docs) (byCommunity[d.communityId] ??= []).push(d.userId);
		return byCommunity;
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
